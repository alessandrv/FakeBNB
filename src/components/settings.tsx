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
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface Tenant {
  name: string;
  avatar: string;
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

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

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

                          <Card className="w-full overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="p-4">Tenant</th>
                                  <th className="p-4">Since</th>
                                  <th className="p-4">Monthly Rent</th>
                                  <th className="p-4">Last Payment</th>
                                  <th className="p-4">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {house.tenants.map((tenant, index) => (
                                  <tr
                                    key={index}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                  >
                                    <td className="p-4 flex items-center gap-3">
                                      <Avatar size="sm" src={tenant.avatar} />
                                      <span className="font-medium">
                                        {tenant.name}
                                      </span>
                                    </td>
                                    <td className="p-4 text-gray-600">
                                      {new Date(
                                        tenant.moveInDate
                                      ).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                      ${tenant.rentAmount}
                                    </td>
                                    <td className="p-4">
                                      {new Date(
                                        tenant.lastPaymentDate
                                      ).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                      <Badge
                                        color={getPaymentStatusColor(
                                          tenant.paymentStatus
                                        )}
                                      >
                                        {tenant.paymentStatus}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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

        {/* Rest of the tabs remain the same */}
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
