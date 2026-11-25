'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Lock,
  Sparkles,
  Building2,
  Receipt,
  QrCode,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import QRCode from 'qrcode';

function PaymentGatewayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('order_id') || searchParams.get('id') || 'ORD-NEW';
  const initialMethod = (searchParams.get('method') === 'cards' ? 'cards' : 'upi') as 'cards' | 'upi';
  const rawAmount = searchParams.get('amount');
  const amountMinor = rawAmount ? Number(rawAmount) : 48000;
  const formattedAmount = (amountMinor / 100).toFixed(2);

  const [paymentMethod, setPaymentMethod] = useState<'cards' | 'upi'>(initialMethod);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'other'>('gpay');
  const [customUpiId, setCustomUpiId] = useState('guest@okhdfcbank');
  
  // Card simulation state
  const [cardNumber, setCardNumber] = useState('4532 8921 7714 6209');
  const [cardHolder, setCardHolder] = useState('Kunwar Vikramaditya');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('842');

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate QR code for UPI
  useEffect(() => {
    const upiPayload = `upi://pay?pa=rajmahal@icici&pn=Rajmahal%20Heritage&am=${formattedAmount}&cu=INR&tn=Order%20${orderId}`;
    QRCode.toDataURL(upiPayload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#4F0809',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR Code generation error:', err));
  }, [formattedAmount, orderId]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('rajmahal@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setProcessingStep('Connecting to Royal Banking Gateway (256-Bit SSL)...');

    await new Promise((r) => setTimeout(r, 800));
    setProcessingStep('Authorizing 3D Secure / UPI Mandate...');

    await new Promise((r) => setTimeout(r, 900));
    setProcessingStep('Verifying payment with Imperial Escrow...');

    await new Promise((r) => setTimeout(r, 600));

    const generatedTxnId = `TXN-RAJ-${Date.now().toString().slice(-8)}`;
    setTransactionId(generatedTxnId);

    // Update order status in backend
    try {
      if (orderId && orderId !== 'ORD-NEW') {
        await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_status: 'completed',
            payment_method: paymentMethod,
            payment_id: generatedTxnId,
          }),
        });

        // Store into localStorage orders list for fast lookup
        try {
          const raw = localStorage.getItem('rajmahal_user_order_ids_v1');
          const ids = raw ? JSON.parse(raw) : [];
          if (!ids.includes(orderId)) {
            ids.unshift(orderId);
            localStorage.setItem('rajmahal_user_order_ids_v1', JSON.stringify(ids.slice(0, 30)));
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Could not update order payment status on server:', err);
    }

    setIsProcessing(false);
    setIsSuccess(true);
  };

  const handleGoToOrder = () => {
    // Navigate back to menu and open the Orders drawer to display this order
    router.push(`/menu?open_orders=true&order_id=${encodeURIComponent(orderId)}`);
  };

  return (
    <div className="min-h-screen bg-[#FFF7E8] text-[#4F0809] flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-[#D8AA67]/30 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#4F0809] text-[#FFF8EB] px-6 py-5 flex items-center justify-between border-b border-[#D8AA67]/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#D8AA67]" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-wide">Rajmahal Heritage Grand</h1>
              <p className="text-[11px] text-[#D8AA67] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit Bank-Grade Secure Payment
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#FFF8EB]/70 uppercase tracking-widest block font-medium">Payable</span>
            <span className="text-xl font-serif font-bold text-[#D8AA67]">₹{formattedAmount}</span>
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="py-20 px-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#4F0809]/5 border-2 border-[#D8AA67] flex items-center justify-center mb-6 relative">
              <Loader2 className="w-8 h-8 text-[#4F0809] animate-spin" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#4F0809] mb-2">Processing Transaction</h3>
            <p className="text-sm text-[#7A6550] animate-pulse">{processingStep}</p>
            <div className="mt-8 flex items-center gap-2 text-[11px] text-[#9C7A45]">
              <Lock className="w-3.5 h-3.5" /> Do not refresh or press back during authorization
            </div>
          </div>
        )}

        {/* Success Screen */}
        {!isProcessing && isSuccess && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500/40 flex items-center justify-center mb-4 shadow-sm animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full mb-3">
              Payment Successful
            </span>

            <h2 className="font-serif text-3xl font-bold text-[#4F0809] mb-1">₹{formattedAmount}</h2>
            <p className="text-xs text-[#7A6550] mb-6">Paid to Rajmahal Heritage Grand Palace Restaurant &amp; Café</p>

            <div className="w-full bg-[#FAF3E0] rounded-2xl p-4 border border-[#D8AA67]/30 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between py-1 border-b border-[#D8AA67]/20">
                <span className="text-[#7A6550]">Order Reference</span>
                <span className="font-bold text-[#4F0809] font-mono">{orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8AA67]/20">
                <span className="text-[#7A6550]">Transaction Ref ID</span>
                <span className="font-bold text-[#4F0809] font-mono">{transactionId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8AA67]/20">
                <span className="text-[#7A6550]">Payment Mode</span>
                <span className="font-bold text-[#4F0809] uppercase">{paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#7A6550]">Date &amp; Time</span>
                <span className="font-bold text-[#4F0809]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Today</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handleGoToOrder}
                className="w-full py-3.5 px-6 rounded-xl bg-[#4F0809] text-[#FFF8EB] font-bold text-sm tracking-wide shadow-md hover:bg-[#3D0607] active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4 text-[#D8AA67]" />
                <span>View Order Status in Your Orders</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/menu"
                className="w-full py-3 px-6 rounded-xl bg-[#FAF3E0] hover:bg-[#F3E8CE] text-[#4F0809] font-bold text-xs uppercase tracking-wider block transition"
              >
                Return to Royal Menu
              </Link>
            </div>
          </div>
        )}

        {/* Payment Selection & Form */}
        {!isProcessing && !isSuccess && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9C7A45]">Choose Payment Mode</span>
              <span className="text-xs text-[#7A6550] font-mono">Ref: {orderId}</span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-[#FAF3E0] p-1.5 rounded-2xl border border-[#D8AA67]/25 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'upi'
                    ? 'bg-[#4F0809] text-[#FFF8EB] shadow-sm'
                    : 'text-[#6B533B] hover:text-[#4F0809]'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Instant UPI &amp; QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cards')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'cards'
                    ? 'bg-[#4F0809] text-[#FFF8EB] shadow-sm'
                    : 'text-[#6B533B] hover:text-[#4F0809]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cards (Debit / Credit)</span>
              </button>
            </div>

            {/* UPI Option */}
            {paymentMethod === 'upi' && (
              <div className="space-y-4">
                <div className="text-center bg-[#FFFDF9] rounded-2xl p-4 border border-[#D8AA67]/30 flex flex-col items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9C7A45] mb-2">Scan &amp; Pay with Any UPI App</span>
                  {qrDataUrl ? (
                    <div className="p-2 bg-white rounded-xl border border-[#D8AA67]/40 shadow-inner">
                      <img src={qrDataUrl} alt="UPI Payment QR Code" className="w-44 h-44 object-contain" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 bg-neutral-100 flex items-center justify-center rounded-xl">
                      <QrCode className="w-8 h-8 text-neutral-400 animate-pulse" />
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#4F0809]">rajmahal@icici</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 rounded-md bg-[#FAF3E0] hover:bg-[#F3E8CE] text-[#4F0809] transition text-[10px] font-bold flex items-center gap-1"
                    >
                      {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Simulated UPI Quick Apps */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-[#7A6550] block">Or Pay via Installed App:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('gpay')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        selectedUpiApp === 'gpay'
                          ? 'border-[#4F0809] bg-[#4F0809]/5 font-bold text-[#4F0809]'
                          : 'border-neutral-200 text-[#7A6550] hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xs block">Google Pay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('phonepe')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        selectedUpiApp === 'phonepe'
                          ? 'border-[#4F0809] bg-[#4F0809]/5 font-bold text-[#4F0809]'
                          : 'border-neutral-200 text-[#7A6550] hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xs block">PhonePe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('paytm')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        selectedUpiApp === 'paytm'
                          ? 'border-[#4F0809] bg-[#4F0809]/5 font-bold text-[#4F0809]'
                          : 'border-neutral-200 text-[#7A6550] hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xs block">Paytm UPI</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#4F0809] text-[#FFF8EB] font-bold text-sm tracking-wide shadow-md hover:bg-[#3D0607] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <Lock className="w-4 h-4 text-[#D8AA67]" />
                  <span>Simulate UPI Payment Approval (₹{formattedAmount})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Cards Option */}
            {paymentMethod === 'cards' && (
              <div className="space-y-4">
                {/* 3D Gold Card Visual */}
                <div className="w-full bg-gradient-to-br from-[#4F0809] via-[#6B0D10] to-[#2B0507] p-5 rounded-2xl text-[#FFF8EB] shadow-lg border border-[#D8AA67]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#D8AA67]/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-serif italic text-sm tracking-wider text-[#D8AA67]">Rajmahal Imperial Card</span>
                    <span className="text-xs font-bold tracking-widest text-[#D8AA67]/80">VISA / RUPAY</span>
                  </div>
                  <div className="w-9 h-7 rounded bg-gradient-to-r from-amber-300 to-amber-500 mb-4 opacity-90" />
                  <p className="font-mono text-base tracking-widest mb-4 font-bold">{cardNumber}</p>
                  <div className="flex justify-between items-end text-[10px] uppercase tracking-wider text-[#FFF8EB]/80 font-medium">
                    <div>
                      <span className="text-[9px] text-[#D8AA67] block">Cardholder</span>
                      <span className="font-semibold text-white">{cardHolder}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#D8AA67] block">Expires</span>
                      <span className="font-semibold text-white">{cardExpiry}</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Card Form Inputs */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#7A6550] font-semibold mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono focus:border-[#4F0809] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#7A6550] font-semibold mb-1">Expiry Date (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono focus:border-[#4F0809] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#7A6550] font-semibold mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono focus:border-[#4F0809] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#7A6550] font-semibold mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-[#4F0809] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#4F0809] text-[#FFF8EB] font-bold text-sm tracking-wide shadow-md hover:bg-[#3D0607] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <Lock className="w-4 h-4 text-[#D8AA67]" />
                  <span>Authorize &amp; Pay ₹{formattedAmount}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-[#7A6550]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simulated Payment Gateway — No real funds deducted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentGatewayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF7E8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#4F0809] animate-spin" />
        </div>
      }
    >
      <PaymentGatewayContent />
    </Suspense>
  );
}
