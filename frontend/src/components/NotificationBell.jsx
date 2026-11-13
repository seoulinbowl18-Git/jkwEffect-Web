import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, fmtDate } from "@/lib/api";

export const NotificationBell = () => {
  const [data, setData] = useState({ items: [], unread: 0 });
  const load = () => api.get("/notifications").then((r) => setData(r.data)).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const onOpen = (open) => {
    if (open && data.unread) api.post("/notifications/read-all").then(() => setData((d) => ({ ...d, unread: 0 })));
  };

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <button data-testid="notification-bell" className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-secondary transition-colors" aria-label="Notifikasi">
          <Bell className="h-5 w-5" />
          {data.unread > 0 && (
            <span data-testid="notification-unread-count" className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold grid place-items-center ring-2 ring-white">
              {data.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl border-border/70 shadow-soft-lg overflow-hidden" data-testid="notification-panel">
        <div className="px-4 py-3 border-b font-bold">Notifikasi</div>
        <div className="max-h-96 overflow-auto">
          {data.items.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">Belum ada notifikasi</p>}
          {data.items.map((n) => (
            <div key={n.notification_id} className="px-4 py-3 border-b last:border-0" data-testid="notification-item">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtDate(n.created_at)}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
