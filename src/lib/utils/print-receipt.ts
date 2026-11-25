'use client';

import type { Reservation } from '@/lib/types';
import { calcNightsCount, formatStayDate } from '@/lib/utils/room-display';
import { formatMoney } from '@/lib/utils/money';

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildWhatsAppBookingTemplate(reservation: Reservation, origin: string): {
  text: string;
  verifyUrl: string;
  voucherImageUrl: string;
} {
  const verifyCode = reservation.verification_code || reservation.reference_code;
  const verifyUrl = `${origin}/bookings?verify=${encodeURIComponent(reservation.id)}`;
  const voucherImageUrl = `${origin}/api/reservations/${encodeURIComponent(
    reservation.id
  )}/voucher-image`;

  const chamberLabel = `${reservation.room_type_name || 'Royal Chamber'}${
    reservation.room_number ? ` (Room #${reservation.room_number})` : ''
  }`;

  const nights = calcNightsCount(reservation.check_in, reservation.check_out);
  const counterTimingNote =
    reservation.early_check_in_opted || reservation.late_check_out_opted
      ? `\nNote: Early Check-In / Late Check-Out opted (additional charges payable at reception counter on arrival).`
      : '';

  const text = [
    `*Rajmahal Heritage Grand Palace — Booking Invitation*`,
    ``,
    `Booking Ref: *${reservation.reference_code}*`,
    `Chamber: *${chamberLabel}*`,
    `Primary Guest: *${reservation.guest?.name || 'Royal Guest'}*`,
    `Check-In: *${formatStayDate(reservation.check_in)}* (${
      reservation.check_in_time || 'After 12:00 Noon'
    })`,
    `Check-Out: *${formatStayDate(reservation.check_out)}* (${
      reservation.check_out_time || 'Before 11:00 AM'
    }) • ${nights} Night${nights > 1 ? 's' : ''}`,
    counterTimingNote,
    ``,
    `*Guest Verification Code:* \`${verifyCode}\``,
    ``,
    `To add this stay to your own account:`,
    `1. Open *Your Bookings*: ${verifyUrl}`,
    `2. Sign in & enter the verification code *${verifyCode}* above.`,
    ``,
    `Official Stay Pass Image:`,
    `${voucherImageUrl}`,
    ``,
    `Padharo Mhare Desh!`,
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return { text, verifyUrl, voucherImageUrl };
}

/**
 * Shares the reservation via Web Share API (with actual PNG voucher image attached when supported
 * on mobile browsers) and falls back cleanly to WhatsApp Web URL with the formatted template,
 * verification code, booking link, and voucher image link.
 */
export async function shareBookingOnWhatsApp(reservation: Reservation): Promise<void> {
  if (typeof window === 'undefined') return;
  const origin = window.location.origin;
  const { text, voucherImageUrl } = buildWhatsAppBookingTemplate(reservation, origin);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const res = await fetch(voucherImageUrl);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], `Rajmahal-Stay-${reservation.reference_code}.png`, {
          type: 'image/png',
        });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Rajmahal Booking ${reservation.reference_code}`,
            text,
            files: [file],
          });
          return;
        }
      }
    } catch (err) {
      // If user cancels native share sheet or browser declines files, do not throw error
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

/**
 * Prints a dedicated, styled A4 Official Rajmahal Reservation Receipt template via an isolated
 * hidden iframe so website navigation bars, buttons, and page chrome are never included.
 */
export function printBookingReceipt(reservation: Reservation): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const nights = calcNightsCount(reservation.check_in, reservation.check_out);
  const rateMinor = reservation.rate_snapshot_minor || 650000;
  const subtotalMinor = rateMinor * nights;
  const taxesMinor = Math.round(subtotalMinor * 0.12);
  const totalMinor = subtotalMinor + taxesMinor;
  const paidMinor = reservation.deposit_amount_minor || 0;
  const balanceMinor = Math.max(0, totalMinor - paidMinor);
  const verifyCode = reservation.verification_code || reservation.reference_code;
  const issuedAt = new Date(reservation.created_at || Date.now()).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const guestRows =
    reservation.guests_details && reservation.guests_details.length > 0
      ? reservation.guests_details.map((g, idx) => {
          const idEntry = reservation.aadhaar_details?.find(
            (a) => a.guest_index === (g.guest_index || idx + 1)
          ) || reservation.aadhaar_details?.[idx];
          return `
            <tr>
              <td>#${idx + 1} ${escapeHtml(g.full_name)}</td>
              <td>${escapeHtml(g.phone)}${g.email ? `<br><span class="muted">${escapeHtml(g.email)}</span>` : ''}</td>
              <td>${escapeHtml(g.dob || '—')}</td>
              <td>
                ${
                  idEntry?.aadhaar_number
                    ? `<span class="mono">${escapeHtml(idEntry.aadhaar_number)}</span>${
                        idEntry.is_verified ? ' <span class="badge-ok">Uploaded</span>' : ''
                      }`
                    : `<span class="muted">${
                        reservation.id_submission_mode === 'submit_at_counter'
                          ? 'Verify at Counter'
                          : 'Pending Check-In'
                      }</span>`
                }
              </td>
            </tr>`;
        })
      : [
          `
            <tr>
              <td>#1 ${escapeHtml(reservation.guest?.name || 'Royal Guest')}</td>
              <td>${escapeHtml(reservation.guest?.phone || '—')}${
                reservation.guest?.email
                  ? `<br><span class="muted">${escapeHtml(reservation.guest.email)}</span>`
                  : ''
              }</td>
              <td>—</td>
              <td>${
                reservation.aadhaar_details?.[0]?.aadhaar_number
                  ? `<span class="mono">${escapeHtml(reservation.aadhaar_details[0].aadhaar_number)}</span>`
                  : '<span class="muted">Verify at Counter</span>'
              }</td>
            </tr>`,
        ];

  const timingNoteHtml =
    reservation.early_check_in_opted || reservation.late_check_out_opted
      ? `<div class="callout-warning">
          <strong>Early Check-In / Late Check-Out Notice:</strong> You have opted for extended arrival/departure timings (${escapeHtml(
            reservation.check_in_time || ''
          )} / ${escapeHtml(
          reservation.check_out_time || ''
        )}). Applicable early check-in / late check-out charges will be settled at the reception counter upon arrival.
        </div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Rajmahal Official Receipt — ${escapeHtml(reservation.reference_code)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: #FAF7F2;
      color: #2B2018;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 2px solid #D8AA67;
      border-radius: 20px;
      padding: 28px 32px;
      position: relative;
      overflow: hidden;
    }
    .inner-frame {
      border: 1px solid #EDE5D8;
      border-radius: 14px;
      padding: 22px 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #EDE5D8;
      padding-bottom: 18px;
      margin-bottom: 18px;
      gap: 16px;
    }
    .brand-eyebrow {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #9C7A45;
    }
    h1 {
      margin: 6px 0 4px;
      font-size: 28px;
      color: #4F0809;
      line-height: 1.1;
    }
    .address {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11px;
      color: #6A5A4E;
      line-height: 1.5;
    }
    .ref-box {
      background: #FAF7F2;
      border: 1px solid #D8AA67;
      border-radius: 12px;
      padding: 12px 16px;
      text-align: right;
      min-width: 195px;
    }
    .ref-label {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8C755C;
      display: block;
    }
    .ref-val {
      font-family: "Courier New", monospace;
      font-size: 20px;
      font-weight: 700;
      color: #4F0809;
      display: block;
      margin-top: 2px;
    }
    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }
    .card {
      background: #FAF7F2;
      border: 1px solid #EDE5D8;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .card-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #9C7A45;
      margin-bottom: 6px;
    }
    .card-main {
      font-size: 15px;
      font-weight: 700;
      color: #4F0809;
      margin-bottom: 3px;
    }
    .card-sub {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11px;
      color: #5C4E42;
      line-height: 1.45;
    }
    .mono { font-family: "Courier New", monospace; font-weight: 600; color: #4F0809; }
    .muted { color: #7A6A5B; font-size: 10px; }
    .callout-warning {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 10px;
      padding: 10px 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11px;
      color: #92400E;
      margin-bottom: 18px;
      line-height: 1.45;
    }
    h3 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #9C7A45;
      margin: 16px 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11.5px;
      margin-bottom: 16px;
    }
    th {
      background: #FAF7F2;
      color: #4F0809;
      text-align: left;
      padding: 8px 10px;
      border-top: 1px solid #E8DFCE;
      border-bottom: 1px solid #E8DFCE;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #F0EAE0;
      vertical-align: top;
    }
    .amount-col { text-align: right; font-weight: 600; }
    .total-row td {
      background: #FAF7F2;
      font-weight: 700;
      color: #4F0809;
      border-top: 1.5px solid #D8AA67;
      border-bottom: 1.5px solid #D8AA67;
      font-size: 13px;
    }
    .badge-ok {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 999px;
      background: #ECFDF5;
      color: #065F46;
      font-size: 9px;
      font-weight: 700;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #EDE5D8;
      padding-top: 14px;
      margin-top: 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10px;
      color: #7A6A5B;
      gap: 20px;
    }
    .signatory {
      text-align: right;
      min-width: 180px;
    }
    .sign-line {
      border-top: 1px solid #9C7A45;
      padding-top: 4px;
      margin-top: 26px;
      font-weight: 700;
      color: #4F0809;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="inner-frame">
      <div class="header">
        <div>
          <div class="brand-eyebrow">Rajmahal Heritage Grand Palace</div>
          <h1>Official Reservation Receipt</h1>
          <div class="address">
            Lake Pichola Promenade, Udaipur, Rajasthan 313001 • GSTIN: 08AAACH1234F1Z5<br />
            Concierge Desk: +91 294 288 9001 • Issued: ${escapeHtml(issuedAt)}
          </div>
        </div>
        <div class="ref-box">
          <span class="ref-label">Booking Reference</span>
          <span class="ref-val">${escapeHtml(reservation.reference_code)}</span>
          <span class="ref-label" style="margin-top:8px;">Guest Verify Code: <span class="mono">${escapeHtml(verifyCode)}</span></span>
          <span class="status-pill">${escapeHtml(reservation.status.replace('_', ' '))}</span>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Chamber &amp; Allocation</div>
          <div class="card-main">${escapeHtml(
            reservation.room_type_name || reservation.room_type?.name || 'Royal Palace Chamber'
          )}${reservation.room_number ? ` • Room #${escapeHtml(reservation.room_number)}` : ''}</div>
          <div class="card-sub">
            Reservation UID: <span class="mono">${escapeHtml(reservation.id)}</span><br />
            Chamber Doc UID: <span class="mono">${escapeHtml(
              reservation.room_id || reservation.room_type_id
            )}</span><br />
            Booked Party Size: <strong>${escapeHtml(reservation.party_size)} Guest${
              reservation.party_size > 1 ? 's' : ''
            }</strong>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Stay Schedule &amp; Timings</div>
          <div class="card-main">${escapeHtml(formatStayDate(reservation.check_in))} &rarr; ${escapeHtml(
            formatStayDate(reservation.check_out)
          )} (${nights} Night${nights > 1 ? 's' : ''})</div>
          <div class="card-sub">
            Check-In: <strong>${escapeHtml(
              reservation.check_in_time || 'After 12:00 Noon (Standard Check-In)'
            )}</strong><br />
            Check-Out: <strong>${escapeHtml(
              reservation.check_out_time || 'Before 11:00 AM (Standard Check-Out)'
            )}</strong>
          </div>
        </div>
      </div>

      ${timingNoteHtml}

      <h3>Registered Guest Party &amp; Identity Dossier</h3>
      <table>
        <thead>
          <tr>
            <th>Guest Name</th>
            <th>Contact</th>
            <th>DOB</th>
            <th>Aadhaar / ID Verification</th>
          </tr>
        </thead>
        <tbody>
          ${guestRows.join('')}
        </tbody>
      </table>

      <h3>Tariff Breakdown &amp; Payment Folio</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount-col">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Room Tariff (${escapeHtml(formatMoney(rateMinor))} &times; ${nights} night${
              nights > 1 ? 's' : ''
            })</td>
            <td class="amount-col">${escapeHtml(formatMoney(subtotalMinor))}</td>
          </tr>
          <tr>
            <td>Heritage Accommodations GST (12%)</td>
            <td class="amount-col">${escapeHtml(formatMoney(taxesMinor))}</td>
          </tr>
          <tr>
            <td>Direct Palace Portal Booking Fee</td>
            <td class="amount-col" style="color:#065F46;">Waived (&#8377;0.00)</td>
          </tr>
          <tr class="total-row">
            <td>Total Stay Tariff (Incl. Taxes)</td>
            <td class="amount-col">${escapeHtml(formatMoney(totalMinor))}</td>
          </tr>
          <tr>
            <td>${
              reservation.payment_status === 'pay_on_arrival' ||
              reservation.payment_method === 'pay_on_arrival'
                ? 'Settlement Mode: Pay on Arrival (Reception Counter)'
                : `Paid Online (${escapeHtml(
                    (reservation.payment_method || 'UPI').toUpperCase()
                  )} &bull; TNR: <span class="mono">${escapeHtml(
                    reservation.payment_reference || 'Recorded'
                  )}</span>)`
            }</td>
            <td class="amount-col" style="color:#065F46;">${escapeHtml(formatMoney(paidMinor))}</td>
          </tr>
          <tr>
            <td>Balance Due at Reception Counter${
              reservation.early_check_in_opted || reservation.late_check_out_opted
                ? ' (+ applicable Early Check-In / Late Check-Out charges)'
                : ''
            }</td>
            <td class="amount-col">${escapeHtml(formatMoney(balanceMinor))}</td>
          </tr>
        </tbody>
      </table>

      ${
        reservation.notes
          ? `<div class="card" style="margin-bottom:10px;">
              <div class="card-title">Notes &amp; Concierge Preferences</div>
              <div class="card-sub">${escapeHtml(reservation.notes)}</div>
            </div>`
          : ''
      }

      <div class="footer">
        <div>
          <strong>Palace Policies:</strong> ${escapeHtml(reservation.terms_snapshot)}<br />
          This folio is digitally issued by Rajmahal Heritage Grand Concierge Desk.
        </div>
        <div class="signatory">
          <div class="sign-line">Authorized Royal Concierge</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 500);
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      cleanup();
    }
  };
}
