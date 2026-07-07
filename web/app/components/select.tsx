// Styled dropdown on Radix Select — keyboard nav, type-ahead, and screen-reader
// semantics for free; warm-stone look; a chevron with actual breathing room.
// One compact API for every select in the app.
import * as RadixSelect from '@radix-ui/react-select';

function Chevron() {
  return (
    <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" aria-hidden>
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckSmall() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type SelectOption = { value: string; label: string };

export function Select(props: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadixSelect.Root value={props.value} onValueChange={props.onChange}>
      <RadixSelect.Trigger
        aria-label={props.ariaLabel}
        className={
          'inline-flex items-center gap-2 rounded-full border border-line bg-transparent py-1 pl-2.5 pr-2.5 text-[length:var(--text-meta)] text-ink-muted transition-colors hover:border-line-strong hover:text-ink data-[state=open]:border-line-strong ' +
          (props.className ?? '')
        }
      >
        <RadixSelect.Value />
        <RadixSelect.Icon className="text-ink-faint">
          <Chevron />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[--radix-select-trigger-width] rounded-xl border border-line bg-raised p-1 shadow-lg"
        >
          <RadixSelect.Viewport>
            {props.options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-3 text-[length:var(--text-meta)] text-ink outline-none data-[highlighted]:bg-sunken"
              >
                <span className="w-3 text-ink">
                  <RadixSelect.ItemIndicator>
                    <CheckSmall />
                  </RadixSelect.ItemIndicator>
                </span>
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
