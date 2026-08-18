import { useState } from "react";
import { Drawer } from "vaul";
import { X, Plus } from "lucide-react";
import { C } from "./jourzy-theme";
import { addressOf } from "./plan-view";
import { apiFetchForm, friendlyErrorMessage } from "../../utils/api";
import { useTranslation } from "../../utils/translations";

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
  const [visited, setVisited] = useState(existingMemory ? existingMemory.visited : true);
  const [caption, setCaption] = useState(existingMemory?.caption || "");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingPhotos: { url: string }[] = existingMemory?.photos || [];

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
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
      form.append("caption", caption);
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

  return (
    <Drawer.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Portal>
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
            <div className="flex flex-wrap gap-2 mb-5">
              {existingPhotos.map((p, i) => (
                <div key={`existing-${i}`} className="w-[74px] h-[74px] rounded-2xl overflow-hidden">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={`new-${i}`} className="w-[74px] h-[74px] rounded-2xl overflow-hidden">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <label className="flex h-[74px] w-[74px] flex-none cursor-pointer items-center justify-center rounded-2xl border-[1.6px] border-dashed" style={{ borderColor: C.line, color: C.green }}>
                <Plus size={20} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />
              </label>
            </div>

            <div className="text-jz-label font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>{t("plan.captionLabel")}</div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("plan.captionPlaceholder")}
              rows={3}
              className="w-full rounded-2xl p-3.5 text-jz-body mb-5 resize-none focus:outline-none"
              style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink }}
            />

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
