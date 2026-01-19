
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function ReportExportBtn() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Button variant="outline" onClick={handlePrint} className="gap-2 no-print">
            <Printer className="h-4 w-4" />
            Export PDF
        </Button>
    );
}
