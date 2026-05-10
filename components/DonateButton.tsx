'use client';

import { useMemo, useState } from "react";

const bitcoinAddress = "bc1qkuk0n39guka0nv0xxxqna2ekk8rcqd5ra6s9en";
const bitcoinUri = "bitcoin:" + bitcoinAddress;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className="rounded-md border border-neutral-700 px-3 py-2 text-sm font-semibold text-white transition hover:border-neutral-400"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function DonateButton() {
  const [open, setOpen] = useState(false);
  const qrUrl = useMemo(
    () =>
      "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=" +
      encodeURIComponent(bitcoinUri),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
      >
        Buy me a beer
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
          <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Support Bleakonomics
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">Buy me a beer</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-400 transition hover:border-neutral-600 hover:text-white"
                aria-label="Close donation modal"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-md border border-neutral-900 bg-black p-4">
              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-md bg-white p-3">
                <img src={qrUrl} alt="Bitcoin donation QR code" className="h-full w-full" />
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Bitcoin address
                </p>
                <div className="mt-2 flex gap-2">
                  <code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded-md border border-neutral-900 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
                    {bitcoinAddress}
                  </code>
                  <CopyButton value={bitcoinAddress} />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded-md border border-neutral-900 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
                  {bitcoinUri}
                </code>
                <CopyButton value={bitcoinUri} />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-neutral-400">
              Thank you for supporting free, open macro charts. Lightning can be added later if you want a lower-fee option.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
