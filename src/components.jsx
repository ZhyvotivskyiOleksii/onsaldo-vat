import { Children, useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CaretDown, CaretUp, Check, X } from "@phosphor-icons/react";

const ease = [0.22, 1, 0.36, 1];
export function IconButton({ icon: Icon, label, className = "", ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={20} />
    </motion.button>
  );
}
export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Checkbox(props) {
  return (
    <span className="check-control">
      <input type="checkbox" {...props} />
      <span className="check-visual">
        <Check size={13} weight="bold" />
      </span>
    </span>
  );
}
export function Select({
  label,
  children,
  className = "",
  value,
  onChange,
  ...props
}) {
  const id = useId();
  const trigger = useRef();
  const [container, setContainer] = useState(null);
  const options = Children.toArray(children);
  return (
    <div className={`field ${className}`}>
      {label && <span id={id}>{label}</span>}
      <SelectPrimitive.Root
        value={String(value)}
        onValueChange={(v) => onChange?.({ target: { value: v } })}
        onOpenChange={() =>
          setContainer(trigger.current?.closest("dialog") || document.body)
        }
      >
        <SelectPrimitive.Trigger
          ref={trigger}
          className="select-trigger"
          aria-labelledby={label ? id : undefined}
          {...props}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <CaretDown size={16} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Content
            className="select-content"
            position="popper"
            sideOffset={7}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll">
              <CaretUp />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="select-viewport">
              {options.map((option) => {
                const val = String(option.props.value ?? option.props.children);
                return (
                  <SelectPrimitive.Item
                    className="select-item"
                    key={val}
                    value={val}
                    disabled={option.props.disabled}
                  >
                    <SelectPrimitive.ItemText>
                      {option.props.children}
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <Check size={16} weight="bold" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="select-scroll">
              <CaretDown />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
export function Popover({
  children,
  label,
  trigger,
  className = "",
  align = "right",
  ...buttonProps
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const button = useRef();
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className={`popover-root ${className}`}
      ref={ref}
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget))
          setOpen(false);
      }}
    >
      <motion.button
        whileTap={{ scale: 0.97 }}
        ref={button}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        {...buttonProps}
      >
        {trigger}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.2, ease }}
            className={`popover align-${align}`}
          >
            {typeof children === "function"
              ? children(() => setOpen(false))
              : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  drawer = false,
  footer,
}) {
  const ref = useRef();
  const present = useIsPresent();
  const reduce = useReducedMotion();
  const mobile = matchMedia("(max-width:700px)").matches;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const scrollPosition = window.scrollY;
    dialog.showModal();
    window.scrollTo({ top: scrollPosition, behavior: "instant" });
    document.body.classList.add("dialog-open");
    return () => {
      dialog.close();
      if (!document.querySelector("dialog[open]")) {
        document.body.classList.remove("dialog-open");
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      }
    };
  }, []);
  return (
    <motion.dialog
      ref={ref}
      aria-label={title}
      data-exiting={!present}
      className={`${drawer ? "drawer" : "modal"} ${wide ? "wide" : ""}`}
      initial={
        reduce
          ? { opacity: 0 }
          : drawer
            ? mobile
              ? { y: "100%", opacity: 0 }
              : { x: "100%", opacity: 0 }
            : { y: 24, scale: 0.97, opacity: 0 }
      }
      animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      exit={
        reduce
          ? { opacity: 0 }
          : drawer
            ? mobile
              ? { y: "100%", opacity: 0 }
              : { x: "100%", opacity: 0 }
            : { y: 16, scale: 0.98, opacity: 0 }
      }
      transition={{ duration: reduce ? 0.1 : drawer ? 0.38 : 0.28, ease }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="modal-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <IconButton icon={X} label="Zamknij" onClick={onClose} />
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </motion.dialog>
  );
}
export function RegisterSkeleton({ count = 10 }) {
  return (
    <div
      className="register-skeleton"
      role="status"
      aria-label="Wczytujemy dokumenty"
    >
      <span className="sr-only">Wczytujemy dokumenty…</span>
      <div className="skeleton-header">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="skeleton" />
        ))}
      </div>
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton skeleton-icon" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ))}
    </div>
  );
}
