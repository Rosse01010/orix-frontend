interface Props {
  message: string;
}

export default function AlertBanner({ message }: Props) {
  return (
    <div className="absolute bottom-2 left-2 bg-red-600 text-white p-1 rounded text-xs shadow-md">
      {message}
    </div>
  );
}
