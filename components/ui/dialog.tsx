'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CloseProps = { onRequestClose?: () => void };

function Dialog({ open = false, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return React.Children.map(children, (child) => React.isValidElement(child)
    ? React.cloneElement(child as React.ReactElement<CloseProps>, { onRequestClose: () => onOpenChange?.(false) })
    : child);
}

function DialogTrigger({ children }: { children?: React.ReactNode }) { return <>{children}</>; }
function DialogPortal({ children }: { children?: React.ReactNode }) { return <>{children}</>; }
function DialogClose({ children, onRequestClose }: { children?: React.ReactNode } & CloseProps) { return <button type="button" onClick={onRequestClose}>{children}</button>; }

function DialogOverlay({ className, onRequestClose, ...props }: React.ComponentProps<'button'> & CloseProps) {
  return <button type="button" aria-label="关闭弹窗" onClick={onRequestClose} className={cn('fixed inset-0 z-50 cursor-default bg-black/20 backdrop-blur-[2px]', className)} {...props} />;
}

function DialogContent({ className, children, showCloseButton = false, onRequestClose, ...props }: React.ComponentProps<'section'> & CloseProps & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay onRequestClose={onRequestClose} />
      <section role="dialog" aria-modal="true" data-slot="dialog-content" className={cn('fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-[0_28px_90px_rgba(10,24,22,.22)] ring-1 ring-foreground/10', className)} {...props}>
        {children}
        {showCloseButton && <Button type="button" variant="ghost" className="absolute right-3 top-3" size="icon-sm" onClick={onRequestClose} aria-label="关闭"><XIcon /></Button>}
      </section>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) { return <div className={cn('flex flex-col gap-2', className)} {...props} />; }
function DialogFooter({ className, children, ...props }: React.ComponentProps<'div'>) { return <div className={cn('-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end', className)} {...props}>{children}</div>; }
function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) { return <h2 className={cn('text-base font-medium leading-none', className)} {...props} />; }
function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) { return <p className={cn('text-sm text-muted-foreground', className)} {...props} />; }

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
