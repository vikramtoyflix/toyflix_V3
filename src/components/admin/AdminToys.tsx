
import { BulkSelectionProvider } from "./bulk/BulkSelectionProvider";
import { AdminToysContent } from "./AdminToysContent";

const AdminToys = () => {
  return (
    <BulkSelectionProvider>
      <AdminToysContent />
    </BulkSelectionProvider>
  );
};

export default AdminToys;
