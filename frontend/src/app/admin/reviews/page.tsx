"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, MessageSquareText, Search, Star, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { ProductImage } from "@/components/ui/ProductImage";
import { Stars } from "@/components/ui/Stars";
import { useToast } from "@/components/ui/Toast";
import { Pagination } from "@/components/admin/Pagination";
import { formatDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { productService } from "@/services/productService";
import { reviewService } from "@/services/reviewService";
import type { Product } from "@/types/product";
import type { AdminReview, AdminReviewPage } from "@/types/review";

const PAGE_SIZE = 10;
const STARS = [5, 4, 3, 2, 1] as const;

export default function AdminReviewsPage() {
  // useSearchParams() cần được bọc trong Suspense
  return (
    <Suspense>
      <AdminReviews />
    </Suspense>
  );
}

function AdminReviews() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  // ?review=12 (bấm từ chuông thông báo "đánh giá mới") → chỉ hiện đánh giá #12
  const focusId = Number(useSearchParams().get("review")) || undefined;

  const [rating, setRating] = useState<number | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<number | undefined>();
  const [hasComment, setHasComment] = useState(false);
  const [sort, setSort] = useState<"newest" | "lowest">("newest");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  // Giữ kết quả cũ trong lúc tải trang / bộ lọc mới (làm mờ thay vì nháy trắng)
  const [loaded, setLoaded] = useState<{ key: string; page: AdminReviewPage } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const [removing, setRemoving] = useState(false);

  // Gõ xong 300ms mới tìm (không gọi API mỗi lần bấm phím)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    productService
      .getAll()
      .then((list) => setProducts([...list].sort((a, b) => a.name.localeCompare(b.name, "vi"))))
      .catch(() => {});
  }, []);

  const query = focusId ? { id: focusId, page: 1, pageSize: PAGE_SIZE } : { rating, search, productId, hasComment, sort, page, pageSize: PAGE_SIZE };
  // Gói bộ lọc thành 1 chuỗi: chuỗi đổi → tải lại (reload tăng sau khi xoá cũng làm chuỗi đổi)
  const queryKey = JSON.stringify({ ...query, reload });
  const result = loaded?.page ?? null;
  const loading = loaded?.key !== queryKey;

  useEffect(() => {
    let cancelled = false;
    reviewService
      .getAll(JSON.parse(queryKey))
      .then((r) => !cancelled && setLoaded({ key: queryKey, page: r }))
      .catch((err: Error) => !cancelled && toast(err.message, "error"));
    return () => {
      cancelled = true;
    };
  }, [queryKey, toast]);

  /** Đổi bộ lọc → quay về trang 1 */
  const filter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };
  const pickRating = filter(setRating);

  const hasFilters = rating !== undefined || search !== "" || productId !== undefined || hasComment;
  const clearFilters = () => {
    setRating(undefined);
    setSearchInput("");
    setSearch("");
    setProductId(undefined);
    setHasComment(false);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await reviewService.remove(deleting.id);
      toast(`Đã xoá đánh giá của ${deleting.authorName}`, "info");
      setDeleting(null);
      // Xoá dòng cuối cùng của trang → lùi về trang trước
      if (result && result.data.length === 1 && page > 1) setPage(page - 1);
      else setReload((n) => n + 1);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setRemoving(false);
    }
  };

  const summary = result?.summary;
  const maxBar = Math.max(1, ...STARS.map((s) => summary?.breakdown[s] ?? 0));
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-coffee-500">Quản lý / Đánh giá</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Đánh giá</h1>
        <p className="mt-1 text-coffee-600">Tất cả đánh giá của khách ở mọi món: lọc theo số sao, tìm theo món / khách / nội dung, xoá đánh giá không phù hợp.</p>
      </div>

      {focusId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50 px-5 py-4 text-sky-900 ring-1 ring-sky-600/20">
          <p className="text-sm">Đang xem đánh giá mới từ thông báo.</p>
          <button onClick={() => router.replace(pathname, { scroll: false })} className="cursor-pointer text-sm font-semibold hover:underline">
            Xem tất cả đánh giá →
          </button>
        </div>
      ) : (
        <>
          {/* Tổng quan số sao — bấm 1 thanh để lọc */}
          <section className="grid gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-coffee-100 sm:grid-cols-[180px_1fr] sm:p-6">
            <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-coffee-100 sm:pr-6">
              <p className="font-display text-5xl font-bold text-coffee-950 tabular-nums">{summary?.average?.toFixed(1).replace(".", ",") ?? "–"}</p>
              <Stars value={summary?.average ?? 0} size="md" className="mt-2" />
              <p className="mt-1 text-sm text-coffee-500">{summary ? `${summary.count} đánh giá` : "Đang tải..."}</p>
            </div>
            <ul className="space-y-1.5">
              {STARS.map((s) => {
                const n = summary?.breakdown[s] ?? 0;
                const active = rating === s;
                return (
                  <li key={s}>
                    <button
                      onClick={() => pickRating(active ? undefined : s)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-sm transition",
                        active ? "bg-amber-50 ring-1 ring-amber-400" : "hover:bg-coffee-50",
                      )}
                      aria-pressed={active}
                      aria-label={`Lọc đánh giá ${s} sao (${n})`}
                    >
                      <span className="flex w-9 shrink-0 items-center gap-1 font-medium text-coffee-800">
                        {s} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-coffee-100">
                        <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / maxBar) * 100}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-right tabular-nums text-coffee-600">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Bộ lọc */}
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-coffee-100 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {[undefined, ...STARS].map((s) => (
                <button
                  key={s ?? "all"}
                  onClick={() => pickRating(s)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition",
                    rating === s ? "bg-coffee-900 text-cream ring-coffee-900" : "bg-white text-coffee-700 ring-coffee-200 hover:bg-coffee-50",
                  )}
                >
                  {s === undefined ? "Tất cả" : (
                    <>
                      {s} <Star className={cn("h-3.5 w-3.5", rating === s ? "fill-cream text-cream" : "fill-amber-400 text-amber-400")} />
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm món, khách, nội dung..."
                  className="pl-9"
                  aria-label="Tìm đánh giá"
                />
              </div>
              <Select value={productId ?? ""} onChange={(e) => filter(setProductId)(e.target.value ? Number(e.target.value) : undefined)} aria-label="Lọc theo món">
                <option value="">Tất cả món</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select value={sort} onChange={(e) => filter(setSort)(e.target.value as "newest" | "lowest")} aria-label="Sắp xếp">
                <option value="newest">Mới nhất trước</option>
                <option value="lowest">Ít sao nhất trước</option>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-coffee-700">
                <input type="checkbox" checked={hasComment} onChange={(e) => filter(setHasComment)(e.target.checked)} className="h-4 w-4 accent-coffee-800" />
                Chỉ đánh giá có viết nhận xét
              </label>
              {hasFilters && (
                <button onClick={clearFilters} className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-coffee-600 hover:text-coffee-950">
                  <X className="h-3.5 w-3.5" /> Xoá bộ lọc
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {/* Danh sách */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
        {result === null ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-coffee-50" />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquareText className="mx-auto h-10 w-10 text-coffee-300" />
            <p className="mt-3 text-sm text-coffee-600">{focusId ? "Đánh giá này không còn (có thể đã bị xoá)." : hasFilters ? "Không có đánh giá nào khớp bộ lọc." : "Chưa có đánh giá nào."}</p>
            {hasFilters && !focusId && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Xoá bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <ul className={cn("divide-y divide-coffee-100", loading && "opacity-60 transition-opacity")}>
            {result.data.map((r) => (
              <li key={r.id} className={cn("flex gap-4 px-5 py-4 sm:px-6", r.id === focusId && "bg-sky-50/60")}>
                <span className="hidden shrink-0 sm:block">
                  <Avatar user={{ name: r.authorName, nickname: "", avatar: r.authorAvatar }} size="md" tone="light" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm">
                      <span className="font-semibold text-coffee-950">{r.authorName}</span> <span className="text-coffee-500">· {r.authorEmail}</span>
                    </p>
                    <p className="text-xs text-coffee-500">
                      {formatDateTime(r.createdAt)}
                      {new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 60_000 && " · đã sửa"}
                    </p>
                  </div>
                  <Stars value={r.rating} size="sm" className="mt-1" />
                  {r.comment ? (
                    <p className="mt-1.5 whitespace-pre-line break-words text-sm text-coffee-800">{r.comment}</p>
                  ) : (
                    <p className="mt-1.5 text-sm italic text-coffee-400">Không có nhận xét</p>
                  )}
                  <Link
                    href={`/menu/${r.productSlug}#danh-gia`}
                    target="_blank"
                    className="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-lg bg-coffee-50 py-1 pl-1 pr-2.5 text-xs font-medium text-coffee-700 transition hover:bg-coffee-100"
                  >
                    <ProductImage src={r.productImage} alt={r.productName} className="h-6 w-6 shrink-0 rounded-md" />
                    <span className="truncate">{r.productName}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
                <button
                  onClick={() => setDeleting(r)}
                  className="h-9 w-9 shrink-0 cursor-pointer self-start rounded-lg p-2 text-coffee-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`Xoá đánh giá của ${r.authorName}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {result && result.total > PAGE_SIZE && !focusId && (
          <Pagination page={page} totalPages={totalPages} totalItems={result.total} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="đánh giá" />
        )}
      </section>

      <Modal
        open={deleting !== null}
        onClose={() => !removing && setDeleting(null)}
        size="sm"
        title="Xoá đánh giá này?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={removing}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={removing}>
              Xoá
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="space-y-2 text-sm text-coffee-700">
            <p>
              <strong>{deleting.authorName}</strong> · {deleting.productName}
            </p>
            <Stars value={deleting.rating} size="sm" />
            {deleting.comment && <p className="rounded-xl bg-coffee-50 px-3 py-2 italic">“{deleting.comment}”</p>}
            <p className="text-coffee-500">Điểm trung bình của món sẽ được tính lại. Không khôi phục được sau khi xoá.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
