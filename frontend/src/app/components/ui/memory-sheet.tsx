import { useState } from "react";
import { Drawer } from "vaul";
import { X, Plus } from "lucide-react";
import { C } from "./jourzy-theme";
import { addressOf } from "./plan-view";
import { apiFetchForm, friendlyErrorMessage } from "../../utils/api";
import { useTranslation } from "../../utils/translations";

type ExistingPhoto = { url: string; path: string; caption: string };

export default function MemorySheet({
  activity, dayNumber, activityIndex, tripId, existingMemory, onSave, onClose,
}: {
  activity: any;
  dayNumber: number;
  activityIndex: number;
  tripId: string;
  existingMemory?: any;
  onSave: (row: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // Defaults off for a brand-new memory — the traveler has to actually flip
  // this on. Defaulting it "visited: true" meant just opening the sheet to
  // add a caption or photo (without touching the toggle) silently recorded
  // a visit that may never have happened.
  const [visited, setVisited] = useState(existingMemory ? existingMemory.visited : false);
  // Live, removable copy of the already-saved photos — deleting one here
  // doesn't hit the server until Save, same as editing a caption doesn't;
  // it's reversible right up until the traveler commits.
  const [keptExisting, setKeptExisting] = useState<ExistingPhoto[]>(
    (existingMemory?.photos || []).map((p: any) => ({ url: p.url, path: p.path, caption: p.caption || "" }))
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newCaptions, setNewCaptions] = useState<string[]>([]);
  // Only meaningful when there's no photo at all to attach a caption to —
  // a plain note that this activity was visited.
  const [noPhotoNote, setNoPhotoNote] = useState(existingMemory?.caption || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPhotoCount = keptExisting.length + newFiles.length;

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setNewFiles((prev) => [...prev, ...files]);
      setNewCaptions((prev) => [...prev, ...files.map(() => "")]);
    }
    e.target.value = "";
  };
  const removeNewFile = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewCaptions((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeExisting = (idx: number) => {
    setKeptExisting((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateExistingCaption = (idx: number, caption: string) => {
    setKeptExisting((prev) => prev.map((p, i) => (i === idx ? { ...p, caption } : p)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("dayNumber", String(dayNumber));
      form.append("activityIndex", String(activityIndex));
      form.append("activityTitle", activity.title || "");
      form.append("visited", String(visited));
      form.append("caption", totalPhotoCount === 0 ? noPhotoNote : "");
      // Tells the backend the exact final set of pre-existing photos to
      // keep — anything from the saved row that's missing here (because the
      // traveler tapped the remove button) gets actually deleted, storage
      // object included, not just dropped from what this request happens to
      // send back.
      form.append("existingPhotos", JSON.stringify(keptExisting.map((p) => ({ path: p.path, caption: p.caption }))));
      form.append("newPhotoCaptions", JSON.stringify(newCaptions));
      newFiles.forEach((f) => form.append("photos", f));

      const resp = await apiFetchForm(`/api/trips/${tripId}/memories`, form);
      if (!resp.ok) {
        setError(await friendlyErrorMessage(resp));
        return;
      }
      const row = await resp.json();
      onSave(row);
    } catch (e) {
      setError(t("chat.errorConnect"));
    } finally {
      setSaving(false);
    }
  };

  // vaul portals its content straight to document.body by default, which
  // breaks out of the phone-frame mockup on desktop web (full-viewport-width
  // sheet instead of confined to the 390px frame). The rest of the app's
  // sheets stay confined for free because the phone frame's CSS `transform`
  // makes it a containing block for position:fixed descendants — but a
  // React portal leaves that DOM subtree entirely, so it doesn't apply.
  // Pointing the portal at the frame div directly (see its id in
  // jourzy-app.tsx) keeps this sheet inside the same visual bounds as
  // every other sheet in the app.
  const frameEl = typeof document !== "undefined" ? document.getElementById("jz-phone-frame") : null;

  return (
    <Drawer.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Portal container={frameEl ?? undefined}>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/45" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-40 flex max-h-[88%] flex-col rounded-t-jz-card bg-jz-bg outline-none">
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-jz-line" />
          <div className="flex items-start justify-between gap-2 px-5 pb-1 pt-2.5">
            <div>
              <Drawer.Title className="text-jz-title font-bold text-jz-ink">{activity.title}</Drawer.Title>
              <p className="text-jz-label text-jz-soft">{addressOf(activity)}</p>
            </div>
            <button onClick={onClose} className="h-[30px] w-[30px] flex-none rounded-full border border-jz-line bg-jz-card text-jz-soft" aria-label="Close">
              <X size={14} className="mx-auto" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 pb-7 pt-3">
            <button
              onClick={() => setVisited((v) => !v)}
              className="w-full flex items-center justify-between rounded-jz-card p-3.5 mb-4"
              style={{ background: C.card, border: `1px solid ${C.line}` }}
            >
              <span className="text-jz-body-big font-bold" style={{ color: C.ink }}>{t("plan.markVisited")}</span>
              <span className="relative rounded-full transition-colors" style={{ width: 40, height: 24, background: visited ? C.green : C.line }}>
                <span className="absolute rounded-full bg-white transition-transform" style={{ width: 18, height: 18, top: 3, left: 3, transform: visited ? "translateX(16px)" : "translateX(0)" }} />
              </span>
            </button>

            <div className="text-jz-label font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>{t("plan.photosLabel")}</div>
            <div className="space-y-2 mb-3">
              {keptExisting.map((p, i) => (
                <div key={p.path || i} className="flex items-center gap-2.5">
                  <div className="w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <input
                    value={p.caption}
                    onChange={(e) => updateExistingCaption(i, e.target.value)}
                    placeholder={t("plan.captionPlaceholder")}
                    maxLength={500}
                    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-jz-body focus:outline-none"
                    style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink }}
                  />
                  <button onClick={() => removeExisting(i)} className="shrink-0 p-1.5 rounded-full" style={{ color: C.hanko }} aria-label={t("plan.deletePhoto")}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={`new-${i}`} className="flex items-center gap-2.5">
                  <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <input
                    value={newCaptions[i] ?? ""}
                    onChange={(e) => setNewCaptions((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))}
                    placeholder={t("plan.captionPlaceholder")}
                    maxLength={500}
                    autoFocus
                    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-jz-body focus:outline-none"
                    style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink }}
                  />
                  <button onClick={() => removeNewFile(i)} className="shrink-0 p-1.5 rounded-full" style={{ color: C.sub }} aria-label={t("plan.deletePhoto")}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl border-[1.6px] border-dashed mb-5 cursor-pointer text-jz-label font-bold"
              style={{ borderColor: C.line, color: C.green }}>
              <Plus size={16} /> {t("plan.addPhotos")}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />
            </label>

            {totalPhotoCount === 0 && (
              <>
                <div className="text-jz-label font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>{t("plan.captionLabel")}</div>
                <textarea
                  value={noPhotoNote}
                  onChange={(e) => setNoPhotoNote(e.target.value)}
                  placeholder={t("plan.captionPlaceholder")}
                  rows={3}
                  className="w-full rounded-2xl p-3.5 text-jz-body mb-5 resize-none focus:outline-none"
                  style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink }}
                />
              </>
            )}

            {error && <div className="text-jz-label mb-3" style={{ color: C.hanko }}>{error}</div>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-jz-btn font-bold text-jz-body-big text-white disabled:opacity-60"
              style={{ background: C.green }}
            >
              {saving ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : t("plan.saveMemory")}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
