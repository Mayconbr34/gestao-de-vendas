'use client';

export default function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <input
        type={type}
        placeholder=" "
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <label>{placeholder || label}</label>
    </div>
  );
}
