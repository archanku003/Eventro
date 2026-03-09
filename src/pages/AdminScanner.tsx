import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AdminScanner() {
  const scannerRef = useRef<any>(null);
  const [status, setStatus] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  const [lastResult, setLastResult] = useState<{ user_id: string; event_id: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    let scannerInstance: any = null;

    async function startScanner() {
      try {
        const lib = await import("html5-qrcode");
        const Html5QrcodeScanner = (lib as any).Html5QrcodeScanner || (lib as any).Html5Qrcode;
        // Html5QrcodeScanner API
        const config = { fps: 10, qrbox: 250 };
        // Create scanner instance that renders into #html5qr-reader
        scannerInstance = new (lib as any).Html5QrcodeScanner("html5qr-reader", config, false);

        const onScanSuccess = async (decodedText: string) => {
          if (!mounted) return;
          // stop further scanning while processing
          try {
            if (scannerInstance && typeof scannerInstance.clear === "function") {
              scannerInstance.clear().catch(() => { });
            }
          } catch (e) { }

          // parse and validate
          let payload: any = null;
          try {
            payload = JSON.parse(decodedText);
          } catch (err) {
            setStatus({ type: "error", text: "Invalid QR payload (not JSON)." });
            return;
          }

          const user_id = String(payload?.user_id ?? payload?.userId ?? payload?.user);
          const event_id = String(payload?.event_id ?? payload?.eventId ?? payload?.event);
          if (!user_id || !event_id) {
            setStatus({ type: "error", text: "QR missing required fields (user_id/event_id)." });
            return;
          }

          setStatus({ type: "info", text: `Processing check-in for user ${user_id}...` });

          try {
            // Find the registration row
            const { data: existing, error: fetchErr } = await supabase
              .from("registrations")
              .select("*")
              .eq("user_id", user_id)
              .eq("event_id", event_id)
              .maybeSingle();

            if (fetchErr) {
              setStatus({ type: "error", text: `Failed to lookup registration: ${fetchErr.message}` });
              return;
            }

            if (!existing) {
              setStatus({ type: "error", text: "Registration not found for scanned user/event." });
              return;
            }

            const already = (existing as any).attendance === true || (existing as any).attended === true;
            if (already) {
              setStatus({ type: "info", text: "Attendance already recorded." });
              setLastResult({ user_id, event_id });
              return;
            }

            // Update attendance: mark attended, clear ticket fields, and set timestamp
            const updatePayload: any = { attended: true, attended_at: new Date().toISOString(), ticket_qr: null, ticket_id: null };
            const { data: updated, error: updateErr } = await supabase
              .from("registrations")
              .update(updatePayload)
              .eq("id", (existing as any).id)
              .select()
              .single();

            if (updateErr) {
              setStatus({ type: "error", text: `Failed to update attendance: ${updateErr.message}` });
              return;
            }

            setStatus({ type: "success", text: `✅ Attendance Marked\nUser ID: ${user_id} \nEvent ID: ${event_id}` });
            setLastResult({ user_id, event_id });
            try {
              // Notify other parts of the app to refresh registration data
              const detail = { id: updated?.id, user_id, event_id, attended: true, ticket_qr: updated?.ticket_qr, scanned: true };
              console.log("AdminScanner: dispatching registrations:changed", detail);
              window.dispatchEvent(new CustomEvent("registrations:changed", { detail }));
            } catch (e) { console.warn(e); }
          } catch (err: any) {
            setStatus({ type: "error", text: `Unexpected error: ${err?.message ?? String(err)}` });
          }
        };

        const onScanError = (errorMessage: any) => {
          // non-fatal scan errors can be ignored or used for debugging
          // keep UI quiet to avoid spamming messages
        };

        scannerInstance.render(onScanSuccess, onScanError);
        scannerRef.current = scannerInstance;
      } catch (err: any) {
        setStatus({ type: "error", text: `Failed to start camera: ${err?.message ?? String(err)}` });
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current && typeof scannerRef.current.clear === "function") {
        try { scannerRef.current.clear(); } catch (e) { }
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Event Check-in Scanner</h1>
        <p className="text-sm text-muted-foreground mb-4">Point your device camera at the attendee QR code.</p>

        <div className="w-full max-w-md mx-auto">
          <div id="html5qr-reader" className="w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: 300 }}></div>

          {status && (
            <div className={`mt-4 p-4 rounded-lg ${status.type === "success" ? "bg-green-50 border border-green-200" : status.type === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
              <p className={`whitespace-pre-wrap ${status.type === "success" ? "text-green-800" : status.type === "error" ? "text-red-800" : "text-blue-800"}`}>{status.text}</p>
            </div>
          )}

          {lastResult && (
            <div className="mt-4 p-3 text-sm text-gray-700 bg-white border rounded">
              <div><strong>User ID:</strong> {lastResult.user_id}</div>
              <div><strong>Event ID:</strong> {lastResult.event_id}</div>
            </div>
          )}

          <div className="mt-6 text-xs text-muted-foreground">Tip: Use a mobile device and allow camera access when prompted.</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
