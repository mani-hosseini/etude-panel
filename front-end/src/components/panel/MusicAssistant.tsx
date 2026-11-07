"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Music2, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const STARTERS = [
  "چطور هر روز بهتر تمرین کنم؟",
  "لگاتو و استاکاتو چه فرقی دارند؟",
  "هانون را چطور شروع کنم؟",
];

function ChatText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+?\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function MusicAssistant() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "سلام، دستیار موسیقی اتود هستم. فقط درباره پیانو، تمرین و تئوری می‌پرسم.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages, pending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setPending(true);
    try {
      const history = nextMessages.filter(
        (item, index) => !(index === 0 && item.role === "assistant"),
      );
      const { reply } = await api.assistantChat(history.slice(-10));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      setError(audienceError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {open ? null : (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          className="fixed bottom-[4.6rem] left-2 z-40 flex items-center gap-1.5 rounded-full border border-white/15 bg-navy/95 px-1.5 py-1 pe-2.5 text-right text-white shadow-lift backdrop-blur-sm sm:bottom-8 sm:left-6 sm:gap-2.5 sm:px-2 sm:py-2 sm:pe-4"
          aria-label="دستیار هوش مصنوعی موسیقی"
        >
          <span className="relative flex size-8 shrink-0 items-center justify-center sm:size-11">
            <span className="absolute inset-0 hidden rounded-full bg-brand/25 motion-safe:animate-ping sm:block" />
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand to-brand-700" />
            <Sparkles
              className="relative size-3.5 text-white sm:size-5"
              strokeWidth={1.8}
            />
            <Music2
              className="absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full bg-navy p-px text-brand-300 sm:size-3.5 sm:p-0.5"
              strokeWidth={2.2}
            />
          </span>
          <span className="min-w-0 leading-none sm:leading-tight">
            <span className="block text-[11px] font-bold sm:hidden">
              دستیار AI
            </span>
            <span className="hidden sm:block">
              <span className="block text-[10px] font-medium tracking-wide text-brand-300">
                هوش مصنوعی
              </span>
              <span className="mt-0.5 block text-sm font-bold">
                دستیار موسیقی اتود
              </span>
            </span>
          </span>
        </motion.button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-end sm:justify-start">
          <button
            type="button"
            className="absolute inset-0 bg-navy/35 backdrop-blur-[2px]"
            aria-label="بستن دستیار"
            onClick={() => setOpen(false)}
          />
          <section className="relative mx-2 mb-[4.55rem] flex h-[min(26rem,calc(100dvh-9rem))] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[22px] border border-border bg-white shadow-lift sm:mx-3 sm:mb-3 sm:h-[min(34rem,calc(100dvh-6rem))] sm:w-[min(24rem,calc(100vw-1.5rem))] sm:rounded-[28px]">
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-700 text-white sm:size-10">
                  <Sparkles className="size-3.5 sm:size-4" strokeWidth={1.8} />
                  <span className="absolute -bottom-0.5 -left-0.5 size-1.5 rounded-full bg-emerald-400 ring-2 ring-white motion-safe:animate-pulse sm:size-2" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-navy sm:text-sm">
                    دستیار هوش مصنوعی
                  </p>
                  <p className="text-[10px] text-muted-foreground sm:text-[11px]">
                    موسیقی و پیانو
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-50 sm:size-9 sm:rounded-xl"
                aria-label="بستن"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5 sm:space-y-3 sm:px-4 sm:py-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-2.5 py-1.5 text-xs leading-5 sm:px-3 sm:py-2 sm:text-[13px] sm:leading-6",
                    message.role === "assistant"
                      ? "bg-brand-50 text-navy"
                      : "ms-auto bg-navy text-white",
                  )}
                >
                  <ChatText text={message.content} />
                </div>
              ))}
              {pending ? (
                <p className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-50 px-2.5 py-1.5 text-xs text-navy sm:px-3 sm:py-2 sm:text-[13px]">
                  <span className="size-1.5 rounded-full bg-brand motion-safe:animate-bounce" />
                  <span className="size-1.5 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:120ms]" />
                  <span className="size-1.5 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:240ms]" />
                  <span className="ms-1 text-[10px] text-muted-foreground sm:text-[11px]">
                    می‌نویسد
                  </span>
                </p>
              ) : null}
              {error ? <p className="text-xs text-rose-600">{error}</p> : null}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-1.5 border-t border-border px-2.5 py-2 sm:space-y-2 sm:px-3 sm:py-3">
              <div className="flex gap-1 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                {STARTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={pending}
                    onClick={() => void send(item)}
                    className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 sm:px-2.5 sm:py-1 sm:text-[11px]"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <form
                className="flex items-end gap-1.5 sm:gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(input);
                }}
              >
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="سؤال موسیقی…"
                  className="min-h-9 max-h-24 flex-1 resize-none text-[13px] sm:min-h-11 sm:max-h-28 sm:text-sm"
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={pending || !input.trim()}
                  aria-label="ارسال"
                  className="size-9 sm:size-10"
                >
                  <Send className="size-3.5 sm:size-4" />
                </Button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
