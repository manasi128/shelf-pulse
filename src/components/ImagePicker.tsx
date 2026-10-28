import { useRef, type ReactNode } from 'react';

/**
 * A button that, when `needsImage` is true, opens the camera (or file picker) first;
 * otherwise it runs straight away (demo mode reads the example shelf).
 */
export default function ImagePicker(props: {
  needsImage: boolean;
  onPick: (image?: Blob) => void;
  className: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={props.className}
        disabled={props.disabled}
        onClick={() => (props.needsImage ? ref.current?.click() : props.onPick())}
      >
        {props.children}
      </button>
      {props.needsImage && (
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) props.onPick(f);
          }}
        />
      )}
    </>
  );
}
