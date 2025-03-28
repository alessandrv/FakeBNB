import React from "react";
import {
  Card,
  CardBody,
  Tabs,
  Tab,
  Input,
  Button,
  Avatar,
  Divider,
  Badge,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface Tenant {
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  moveInDate: string;
  paymentStatus: "paid" | "pending" | "overdue";
  lastPaymentDate: string;
  rentAmount: number;
  paymentHistory: Array<{
    date: string;
    amount: number;
    status: "completed" | "pending" | "failed";
  }>;
}

interface House {
  id: string;
  address: string;
  occupants: number;
  status: "occupied" | "vacant";
  tenants: Tenant[];
  monthlyRent: number;
  image: string;
}

export const Settings = () => {
  const [selectedTab, setSelectedTab] = React.useState("profile");
  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [houses] = React.useState<House[]>([
    {
      id: "1",
      address: "123 Main St, New York, NY",
      occupants: 3,
      status: "occupied",
      monthlyRent: 2500,
      image: "https://picsum.photos/seed/house1/400/300",
      tenants: [
        {
          name: "Alice Johnson",
          avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
          email: "alice.johnson@example.com",
          phone: "+1 234-567-8901",
          moveInDate: "2023-01-15",
          paymentStatus: "paid",
          lastPaymentDate: "2024-02-01",
          rentAmount: 1250,
          paymentHistory: [
            { date: "2024-02-01", amount: 1250, status: "completed" },
            { date: "2024-01-01", amount: 1250, status: "completed" },
            { date: "2023-12-01", amount: 1250, status: "completed" },
          ],
        },
        {
          name: "Bob Smith",
          avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
          email: "bob.smith@example.com",
          phone: "+1 234-567-8902",
          moveInDate: "2023-01-15",
          paymentStatus: "pending",
          lastPaymentDate: "2024-01-01",
          rentAmount: 1250,
          paymentHistory: [
            { date: "2024-02-01", amount: 1250, status: "pending" },
            { date: "2024-01-01", amount: 1250, status: "completed" },
            { date: "2023-12-01", amount: 1250, status: "completed" },
          ],
        },
      ],
    },
    {
      id: "2",
      address: "456 Park Ave, Boston, MA",
      occupants: 0,
      status: "vacant",
      monthlyRent: 3000,
      image: "https://picsum.photos/seed/house2/400/300",
      tenants: [],
    },
  ]);

  const getPaymentStatusColor = (status: Tenant["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "danger";
      default:
        return "default";
    }
  };

  // Icons for table actions
  const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        focusable="false"
        height="1em"
        role="presentation"
        viewBox="0 0 20 20"
        width="1em"
        {...props}
      >
        <path
          d="M12.9833 10C12.9833 11.65 11.65 12.9833 10 12.9833C8.35 12.9833 7.01666 11.65 7.01666 10C7.01666 8.35 8.35 7.01666 10 7.01666C11.65 7.01666 12.9833 8.35 12.9833 10Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d="M9.99999 16.8916C12.9417 16.8916 15.6833 15.1583 17.5917 12.1583C18.3417 10.9833 18.3417 9.00831 17.5917 7.83331C15.6833 4.83331 12.9417 3.09998 9.99999 3.09998C7.05833 3.09998 4.31666 4.83331 2.40833 7.83331C1.65833 9.00831 1.65833 10.9833 2.40833 12.1583C4.31666 15.1583 7.05833 16.8916 9.99999 16.8916Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
    );
  };

  const DeleteIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        focusable="false"
        height="1em"
        role="presentation"
        viewBox="0 0 20 20"
        width="1em"
        {...props}
      >
        <path
          d="M17.5 4.98332C14.725 4.70832 11.9333 4.56665 9.15 4.56665C7.5 4.56665 5.85 4.64998 4.2 4.81665L2.5 4.98332"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d="M7.08331 4.14169L7.26665 3.05002C7.39998 2.25835 7.49998 1.66669 8.90831 1.66669H11.0916C12.5 1.66669 12.6083 2.29169 12.7333 3.05835L12.9166 4.14169"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d="M15.7084 7.61664L15.1667 16.0083C15.075 17.3166 15 18.3333 12.675 18.3333H7.32502C5.00002 18.3333 4.92502 17.3166 4.83335 16.0083L4.29169 7.61664"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d="M8.60834 13.75H11.3833"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d="M7.91669 10.4167H12.0834"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
    );
  };

  const EditIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        focusable="false"
        height="1em"
        role="presentation"
        viewBox="0 0 20 20"
        width="1em"
        {...props}
      >
        <path
          d="M11.05 3.00002L4.20835 10.2417C3.95002 10.5167 3.70002 11.0584 3.65002 11.4334L3.34169 14.1334C3.23335 15.1084 3.93335 15.775 4.90002 15.6084L7.58335 15.15C7.95835 15.0834 8.48335 14.8084 8.74168 14.525L15.5834 7.28335C16.7667 6.03335 17.3 4.60835 15.4583 2.86668C13.625 1.14168 12.2334 1.75002 11.05 3.00002Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit={10}
          strokeWidth={1.5}
        />
        <path
          d="M9.90833 4.20831C10.2667 6.50831 12.1333 8.26665 14.45 8.49998"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit={10}
          strokeWidth={1.5}
        />
        <path
          d="M2.5 18.3333H17.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit={10}
          strokeWidth={1.5}
        />
      </svg>
    );
  };

  // Function to handle opening the tenant details modal
  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    onOpen();
  };

  // Function to get status color for payment history
  const getPaymentHistoryStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Tenant Payment History Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedTenant && (
                  <div className="flex items-center gap-3">
                    <Avatar src={selectedTenant.avatar} size="sm" />
                    <div>
                      <h3 className="text-lg font-semibold">{selectedTenant.name}</h3>
                      <p className="text-small text-default-500">{selectedTenant.email}</p>
                    </div>
                  </div>
                )}
              </ModalHeader>
              <ModalBody>
                {selectedTenant && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-small text-default-500">Since</p>
                        <p>{new Date(selectedTenant.moveInDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-small text-default-500">Monthly Rent</p>
                        <p>${selectedTenant.rentAmount}</p>
                      </div>
                      <div>
                        <p className="text-small text-default-500">Payment Status</p>
                        <Chip
                          className="capitalize"
                          color={getPaymentStatusColor(selectedTenant.paymentStatus)}
                          size="sm"
                          variant="flat"
                        >
                          {selectedTenant.paymentStatus}
                        </Chip>
                      </div>
                    </div>
                    
                    <Divider className="my-4" />
                    
                    <h4 className="text-medium font-semibold mb-3">Payment History</h4>
                    
                    <div className="overflow-x-auto w-full">
                      <Table aria-label="Payment History Table" className="min-w-full">
                        <TableHeader>
                          <TableColumn>DATE</TableColumn>
                          <TableColumn>AMOUNT</TableColumn>
                          <TableColumn>STATUS</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {selectedTenant.paymentHistory.map((payment, index) => (
                            <TableRow key={index}>
                              <TableCell className="whitespace-nowrap">{new Date(payment.date).toLocaleDateString()}</TableCell>
                              <TableCell className="whitespace-nowrap">${payment.amount}</TableCell>
                              <TableCell>
                                <Chip
                                  className="capitalize text-xs"
                                  color={getPaymentHistoryStatusColor(payment.status)}
                                  size="sm"
                                  variant="flat"
                                >
                                  {payment.status}
                                </Chip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={setSelectedTab as any}
        aria-label="Settings"
        className="max-w-full overflow-x-auto"
      >
        <Tab key="profile" title="Profile">
          <Card>
            <CardBody className="gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <Avatar
                  size="lg"
                  src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
                  isBordered
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Profile Picture</h3>
                  <p className="text-small text-default-500">
                    Update your profile picture
                  </p>
                  <div className="mt-2">
                    <Button size="sm">Change Photo</Button>
                  </div>
                </div>
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  defaultValue="John"
                  variant="bordered"
                />
                <Input
                  label="Last Name"
                  defaultValue="Doe"
                  variant="bordered"
                />
                <Input
                  label="Email"
                  defaultValue="john.doe@example.com"
                  type="email"
                  variant="bordered"
                />
                <Input
                  label="Phone"
                  defaultValue="+1 234 567 890"
                  type="tel"
                  variant="bordered"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="flat">Cancel</Button>
                <Button color="primary">Save Changes</Button>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="houses" title="My Houses">
          <div className="space-y-6">
            {houses.map((house) => (
              <Card key={house.id} className="w-full">
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
                    <img
                      src={house.image}
                      alt={house.address}
                      className="w-full h-48 md:h-full object-cover rounded-lg"
                    />
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {house.address}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              color={
                                house.status === "occupied"
                                  ? "success"
                                  : "danger"
                              }
                            >
                              {house.status}
                            </Badge>
                            {house.status === "occupied" && (
                              <span className="text-small text-default-500">
                                {house.occupants} occupants
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<Icon icon="lucide:edit" />}
                        >
                          Manage
                        </Button>
                      </div>

                      {house.status === "occupied" && (
                        <div className="space-y-4">
                          <h4 className="text-medium font-semibold">
                            Current Tenants
                          </h4>

                          <Card className="w-full">
                            <CardBody>
                              <div className="flex flex-col gap-3">
                                {house.tenants.map((tenant, index) => (
                                  <div key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <User
                                          avatarProps={{ radius: "lg", src: tenant.avatar }}
                                          description={tenant.email}
                                          name={tenant.name}
                                        >
                                          {tenant.email}
                                        </User>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Tooltip content="View Payment History">
                                          <Button isIconOnly size="sm" variant="light" onPress={() => handleViewTenant(tenant)}>
                                            <EyeIcon />
                                          </Button>
                                        </Tooltip>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                      <div>
                                        <p className="text-small text-default-500">Since</p>
                                        <p>{new Date(tenant.moveInDate).toLocaleDateString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-small text-default-500">Monthly Rent</p>
                                        <p>${tenant.rentAmount}</p>
                                      </div>
                                      <div>
                                        <p className="text-small text-default-500">Last Payment</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm">{new Date(tenant.lastPaymentDate).toLocaleDateString()}</p>
                                          <Chip
                                            className="capitalize text-xs"
                                            color={getPaymentStatusColor(tenant.paymentStatus)}
                                            size="sm"
                                            variant="flat"
                                          >
                                            {tenant.paymentStatus}
                                          </Chip>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </Tab>

        <Tab key="payment" title="Payment Methods">
          <Card>
            <CardBody className="gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Payment Methods</h3>
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Icon icon="lucide:plus" />}
                >
                  Add New Card
                </Button>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <Icon icon="logos:visa" className="text-2xl" />
                    <div>
                      <p className="font-medium">Visa ending in 4242</p>
                      <p className="text-small text-default-500">
                        Expires 12/24
                      </p>
                    </div>
                  </div>
                  <Button isIconOnly variant="light" color="danger">
                    <Icon icon="lucide:trash-2" />
                  </Button>
                </div>

                <div className="border rounded-lg p-4 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <Icon icon="logos:mastercard" className="text-2xl" />
                    <div>
                      <p className="font-medium">Mastercard ending in 8888</p>
                      <p className="text-small text-default-500">
                        Expires 09/25
                      </p>
                    </div>
                  </div>
                  <Button isIconOnly variant="light" color="danger">
                    <Icon icon="lucide:trash-2" />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="notifications" title="Notifications">
          <Card>
            <CardBody className="gap-4">
              <h3 className="text-lg font-semibold">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-small text-default-500">
                      Receive updates about your properties
                    </p>
                  </div>
                  <Button variant="flat">Configure</Button>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-small text-default-500">
                      Get instant alerts on your phone
                    </p>
                  </div>
                  <Button variant="flat">Configure</Button>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-small text-default-500">
                      Browser notifications for important updates
                    </p>
                  </div>
                  <Button variant="flat">Configure</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};
