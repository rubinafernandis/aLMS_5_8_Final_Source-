import { BookOpen, CheckCircle2, Clock, Lock, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { ACCENT, fmtMinutes } from '../lib/format';
import { Button, Card, cx, Empty, ErrorBox, Loading, Modal, navigate, PageHeader, Pill, useConfirm, useLoad, useToast } from '../components/ui';
import { useLearner } from './context';

interface CatalogCourse {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  credentialName: string;
  durationLabel: string;
  level: string;
  price: number;
  access: 'open' | 'invite';
  accent: string;
  coverImage?: string;
  modules: { title: string; lessons: number }[];
  lessons: number;
  minutes: number;
  hasFinal: boolean;
  enrolled: boolean;
  learners: number;
  requested: boolean;
}

type Gateway = 'razorpay' | 'stripe' | 'paypal';
interface PaymentConfig {
  ready: boolean;
  provider: Gateway | null;
  currency: string;
  methods?: { id: Gateway; title: string; detail: string }[];
}

type Checkout =
  | { alreadyEnrolled: true }
  | { provider: 'stripe' | 'paypal'; paymentId: string; url: string }
  | { provider: 'razorpay'; paymentId: string; keyId: string; orderId: string; amount: number; currency: string; courseTitle: string; prefill: { name: string; email: string } };

export const formatPrice = (amount: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

/** Razorpay's checkout script, loaded once, only when a learner actually pays. */
let razorpayScript: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve();
  razorpayScript ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      razorpayScript = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return razorpayScript;
}

export default function Explore() {
  const { reload: reloadHome, setActiveId, readOnly } = useLearner();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useLoad(() => api<{ courses: CatalogCourse[]; payments?: PaymentConfig }>('/learner/catalog'), []);
  const [busy, setBusy] = useState('');
  const currency = data?.payments?.currency ?? 'USD';
  const price = (c: CatalogCourse) => formatPrice(c.price, currency);

  const opened = async (courseId: string, title: string, message?: string) => {
    await reloadHome();
    setActiveId(courseId);
    toast('success', message ?? `You are enrolled in ${title}.`);
    navigate('dashboard');
  };

  // Coming back from Stripe's payment page: confirm with the server (which asks Stripe) before opening.
  const returned = useRef(false);
  useEffect(() => {
    if (returned.current) return;
    returned.current = true;
    const q = new URLSearchParams(window.location.search);
    const state = q.get('checkout');
    if (!state) return;
    const sessionId = q.get('session_id');
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    if (state === 'cancelled') {
      toast('info', 'Payment cancelled. You have not been charged.');
      return;
    }
    if (state === 'paypal' && q.get('token')) {
      // Back from PayPal: the server captures the payment and checks it before the course opens.
      const orderId = q.get('token');
      void (async () => {
        try {
          const r = await api<{ courseId: string }>('/payments/paypal/capture', { body: { orderId } });
          await opened(r.courseId, '', 'Payment received. Your course is open.');
        } catch (e) {
          toast((e as ApiError).status === 402 ? 'info' : 'error', (e as Error).message);
          void reload(true);
        }
      })();
      return;
    }
    if (state === 'success' && sessionId) {
      void (async () => {
        try {
          const r = await api<{ courseId: string }>('/payments/stripe/confirm', { body: { sessionId } });
          await opened(r.courseId, '', 'Payment received. Your course is open.');
        } catch (e) {
          toast((e as ApiError).status === 402 ? 'info' : 'error', (e as Error).message);
          void reload(true);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enrollFree = async (c: CatalogCourse) => {
    setBusy(c.id);
    try {
      await api(`/learner/enroll/${c.id}`, { body: {} });
      await opened(c.id, c.title);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const pay = async (c: CatalogCourse) => {
    if (!data?.payments?.ready) {
      toast('error', 'Online payment is not set up on this LMS yet. Please contact your instructor to get access.');
      return;
    }
    const methods = data.payments.methods ?? [];
    let gateway: Gateway | undefined = methods[0]?.id;
    if (methods.length > 1) {
      // Several ways to pay: the learner chooses (UPI for India, cards, PayPal...).
      const picked = await choose(c, methods);
      if (!picked) return;
      gateway = picked;
    } else {
      const ok = await confirm({
        title: `Enroll in ${c.title}?`,
        text: `This micro-credential costs ${price(c)} once, with nothing else to buy. You will pay on a secure payment page${methods[0] ? ` (${methods[0].title})` : ''}, and the course opens as soon as the payment is confirmed.`,
        confirm: `Pay ${price(c)}`,
      });
      if (!ok) return;
    }
    setBusy(c.id);
    try {
      const r = await api<Checkout>(`/payments/checkout/${c.id}`, { body: { gateway } });
      if ('alreadyEnrolled' in r) {
        await opened(c.id, c.title);
        setBusy('');
        return;
      }
      if (r.provider !== 'razorpay') {
        window.location.assign(r.url); // The gateway's own secure page; it sends the learner back here.
        return;
      }
      await loadRazorpay();
      const rz = new (window as any).Razorpay({
        key: r.keyId,
        order_id: r.orderId,
        amount: r.amount,
        currency: r.currency,
        name: 'USAII®',
        description: r.courseTitle,
        prefill: r.prefill,
        theme: { color: '#1F6BFF' },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api('/payments/razorpay/verify', { body: { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature } });
            await opened(c.id, c.title, `Payment received. ${c.title} is open.`);
          } catch (e) {
            toast((e as ApiError).status === 402 ? 'info' : 'error', (e as Error).message);
            void reload(true);
          } finally {
            setBusy('');
          }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      rz.on('payment.failed', (resp: { error?: { description?: string } }) => {
        toast('error', resp.error?.description || 'The payment did not go through. You have not been charged.');
      });
      rz.open();
    } catch (e) {
      toast('error', (e as Error).message);
      setBusy('');
    }
  };

  const enroll = (c: CatalogCourse) => (c.price > 0 ? pay(c) : enrollFree(c));

  // Payment method chooser (shown when more than one gateway is on).
  const [chooser, setChooser] = useState<{ course: CatalogCourse; methods: NonNullable<PaymentConfig['methods']>; pick: Gateway; done: (g: Gateway | null) => void } | null>(null);
  const choose = (course: CatalogCourse, methods: NonNullable<PaymentConfig['methods']>) =>
    new Promise<Gateway | null>((resolve) => setChooser({ course, methods, pick: methods[0].id, done: resolve }));
  const closeChooser = (g: Gateway | null) => {
    chooser?.done(g);
    setChooser(null);
  };
  const chooserUi = chooser && (
    <Modal
      open
      onClose={() => closeChooser(null)}
      title={`Pay for ${chooser.course.title}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => closeChooser(null)}>
            Cancel
          </Button>
          <Button onClick={() => closeChooser(chooser.pick)}>Pay {price(chooser.course)}</Button>
        </div>
      }
    >
      <p className="text-sm text-ink-soft">One payment of {price(chooser.course)}. You pay on the provider's secure page, and the course opens as soon as the payment is confirmed.</p>
      <fieldset className="mt-4 space-y-2">
        <legend className="mb-2 text-sm font-semibold">Choose how to pay</legend>
        {chooser.methods.map((m) => (
          <label key={m.id} className={cx('flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition', chooser.pick === m.id ? 'border-nblue bg-nblue-soft/40' : 'border-line hover:border-nblue/40')}>
            <input type="radio" name="pay-method" className="mt-1 h-4 w-4 accent-[#1a5fe6]" checked={chooser.pick === m.id} onChange={() => setChooser({ ...chooser, pick: m.id })} />
            <span>
              <span className="block font-semibold">{m.title}</span>
              <span className="block text-[13px] text-ink-soft">{m.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );

  const request = async (c: CatalogCourse) => {
    setBusy(c.id);
    try {
      await api(`/learner/request-access/${c.id}`, { body: {} });
      toast('success', 'Request sent. An instructor will respond soon.');
      await reload(true);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void reload()} />;
  const courses = data?.courses ?? [];

  return (
    <div>
      {chooserUi}
      <PageHeader title="Explore Courses" subtitle="Short, practical AI credentials for everyone. No coding. One fair price, nothing to upgrade." />
      {courses.length === 0 && <Empty icon={<BookOpen className="h-6 w-6" />} title="No courses published yet" />}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => {
          const a = ACCENT[c.accent] ?? ACCENT.blue;
          return (
            <Card key={c.id} hover className="flex flex-col !p-0 overflow-hidden">
              <div className="relative h-28 overflow-hidden" style={{ background: c.coverImage ? undefined : `linear-gradient(135deg, ${a.hex}, ${a.hex}88 60%, #ffffff)` }}>
                {c.coverImage && <img src={c.coverImage} alt="" className="h-full w-full object-cover" />}
                <div className="absolute bottom-3 left-4 flex gap-1.5">
                  <span className="on-color rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold" style={{ color: a.text }}>
                    {c.price === 0 ? 'Free' : price(c)}
                  </span>
                  {c.access === 'invite' && (
                    <span className="on-color inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                      <Lock className="h-3 w-3" /> By invitation
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold leading-snug">{c.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{c.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill color="gray">
                    <Clock className="h-3 w-3" /> {c.durationLabel || fmtMinutes(c.minutes)}
                  </Pill>
                  <Pill color="gray">
                    {c.lessons} lessons{c.hasFinal ? ' + final' : ''}
                  </Pill>
                  <Pill color="gray">
                    <Users className="h-3 w-3" /> {c.learners}
                  </Pill>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{c.description}</p>
                <p className="mt-2 text-xs text-ink-faint">Earn: {c.credentialName}</p>
                <div className="mt-auto pt-5">
                  {c.enrolled ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      icon={<CheckCircle2 className="h-4 w-4 text-ngreen" />}
                      onClick={() => {
                        setActiveId(c.id);
                        navigate('dashboard');
                      }}
                    >
                      Enrolled: go to course
                    </Button>
                  ) : c.access === 'invite' ? (
                    <Button variant="secondary" className="w-full" disabled={readOnly || c.requested} loading={busy === c.id} onClick={() => void request(c)}>
                      {c.requested ? 'Access requested' : 'Request access'}
                    </Button>
                  ) : (
                    <Button className="w-full" disabled={readOnly} loading={busy === c.id} onClick={() => void enroll(c)}>
                      {c.price === 0 ? 'Start for free' : `Enroll for ${price(c)}`}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
