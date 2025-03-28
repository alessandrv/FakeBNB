import React from 'react';
import {
  Card,
  CardBody,
  Tabs,
  Tab,
  Input,
  Button,
  Avatar,
  Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';

interface House {
  id: string;
  address: string;
  occupants: number;
  status: 'occupied' | 'vacant';
  tenants: Array<{
    name: string;
    avatar: string;
    moveInDate: string;
  }>;
}

export const Settings = () => {
  const [selectedTab, setSelectedTab] = React.useState('profile');
  const [houses] = React.useState<House[]>([
    {
      id: '1',
      address: '123 Main St, New York, NY',
      occupants: 3,
      status: 'occupied',
      tenants: [
        {
          name: 'Alice Johnson',
          avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
          moveInDate: '2023-01-15'
        },
        {
          name: 'Bob Smith',
          avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
          moveInDate: '2023-01-15'
        }
      ]
    },
    {
      id: '2',
      address: '456 Park Ave, Boston, MA',
      occupants: 0,
      status: 'vacant',
      tenants: []
    }
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs 
        selectedKey={selectedTab} 
        onSelectionChange={setSelectedTab as any}
        aria-label="Settings"
      >
        <Tab key="profile" title="Profile">
          <Card>
            <CardBody className="gap-4">
              <div className="flex gap-4 items-start">
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
          <Card>
            <CardBody>
              <div className="space-y-6">
                {houses.map((house) => (
                  <div key={house.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{house.address}</h3>
                        <p className="text-small text-default-500">
                          Status: {house.status === 'occupied' ? (
                            <span className="text-success">Occupied</span>
                          ) : (
                            <span className="text-danger">Vacant</span>
                          )}
                        </p>
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

                    {house.status === 'occupied' && (
                      <div>
                        <h4 className="text-medium font-semibold mb-2">Current Tenants</h4>
                        <div className="flex gap-4">
                          {house.tenants.map((tenant, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Avatar
                                size="sm"
                                src={tenant.avatar}
                              />
                              <div>
                                <p className="text-small font-medium">{tenant.name}</p>
                                <p className="text-tiny text-default-500">
                                  Since {new Date(tenant.moveInDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
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
                      <p className="text-small text-default-500">Expires 12/24</p>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    color="danger"
                  >
                    <Icon icon="lucide:trash-2" />
                  </Button>
                </div>

                <div className="border rounded-lg p-4 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <Icon icon="logos:mastercard" className="text-2xl" />
                    <div>
                      <p className="font-medium">Mastercard ending in 8888</p>
                      <p className="text-small text-default-500">Expires 09/25</p>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    color="danger"
                  >
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
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-small text-default-500">
                      Receive updates about your properties
                    </p>
                  </div>
                  <Button variant="flat">Configure</Button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-small text-default-500">
                      Get instant alerts on your phone
                    </p>
                  </div>
                  <Button variant="flat">Configure</Button>
                </div>

                <div className="flex justify-between items-center">
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