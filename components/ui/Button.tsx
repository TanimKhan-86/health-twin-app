import { Text, TouchableOpacity, TouchableOpacityProps, View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for class merging (similar to shadcn/ui) already imported


const buttonVariants = cva(
    "flex-row items-center justify-center rounded-xl px-4 py-3 active:opacity-90",
    {
        variants: {
            variant: {
                default: "bg-brand-primary",
                destructive: "bg-status-error",
                outline: "border border-brand-primary bg-transparent",
                secondary: "bg-brand-secondary",
                ghost: "bg-transparent",
                link: "text-brand-primary underline-offset-4",
            },
            size: {
                default: "h-12",
                sm: "h-9 px-3",
                lg: "h-14 px-8",
                icon: "h-10 w-10 p-0",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

interface ButtonProps
    extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
    label?: string;
    labelClasses?: string;
    icon?: React.ReactNode;
}

export function Button({
    className,
    variant,
    size,
    label,
    labelClasses,
    children,
    icon,
    ...props
}: ButtonProps) {
    return (
        <TouchableOpacity
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        >
            {icon && <View className="mr-2">{icon}</View>}
            {label ? (
                <Text
                    className={cn(
                        "text-white font-medium text-base",
                        variant === "outline" && "text-brand-primary",
                        variant === "ghost" && "text-brand-primary",
                        variant === "link" && "text-brand-primary underline",
                        labelClasses
                    )}
                >
                    {label}
                </Text>
            ) : (
                children
            )}
        </TouchableOpacity>
    );
}
