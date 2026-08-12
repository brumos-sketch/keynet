import { cn } from "@/lib/utils";

interface FeatureStepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureStep({ icon, title, description }: FeatureStepProps) {
  return (
    <div className="group text-center">
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-navy transition-all duration-300 group-hover:bg-electric group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-4 text-2xl font-bold text-navy">{title}</h3>
      <p className="leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}
