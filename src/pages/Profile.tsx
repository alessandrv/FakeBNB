import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Tabs, Tab, Avatar, Spinner, Badge, Divider, User, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

// Define interfaces for house management
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

export const Profile = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get tab from URL query parameter or default to 'account'
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return tab && ['account', 'houses', 'security', 'preferences'].includes(tab) ? tab : 'account';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [profileForm, setProfileForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phoneNumber: user?.phone_number || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate({
      pathname: location.pathname,
      search: `?tab=${tab}`
    }, { replace: true });
  };
  useEffect(() => {
    document.documentElement.style.setProperty('--hide-header-mobile', 'None');
   
  }, []);
  // Listen for URL changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.search]);

  // Sample houses data
  const [houses] = useState<House[]>([
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

  // Initialize form values when user data loads
  React.useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phoneNumber: user.phone_number || '',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setProfileForm({ ...profileForm, [field]: value });
  };

  const handleSaveProfile = async () => {
    // In a real app, you would call an API endpoint to update user profile
    setIsSaving(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
      // You would typically update the user context here after a successful API call
    }, 1000);
  };

  // Function to get status color
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

  // Function to get payment history status color
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

  // Function to handle opening the tenant details modal
  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    onOpen();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  const getInitials = () => {
    if (!user?.first_name && !user?.last_name) return '?';
    
    const firstInitial = user.first_name ? user.first_name.charAt(0).toUpperCase() : '';
    const lastInitial = user.last_name ? user.last_name.charAt(0).toUpperCase() : '';
    
    return `${firstInitial}${lastInitial}`;
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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Your Profile</h1>
      
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
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left sidebar */}
        <div>
          <Card className="mb-6">
            <CardBody className="flex flex-col items-center p-6">
              <Avatar 
                name={getInitials()} 
                size="lg" 
                className="mb-4 text-lg"
              />
              <div className="text-center">
                <h2 className="font-semibold text-xl">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-default-500">{user?.email}</p>
              </div>
            </CardBody>
          </Card>
          
          <Card className="hidden md:block">
            <CardBody className="p-0">
              <div className="flex flex-col">
                <button 
                  onClick={() => handleTabChange('account')}
                  className={`flex items-center gap-3 p-4 ${activeTab === 'account' ? 'bg-primary-100 text-primary' : 'hover:bg-default-100'}`}
                >
                  <Icon icon="lucide:user" />
                  <span>Account</span>
                </button>
                <button 
                  onClick={() => handleTabChange('houses')}
                  className={`flex items-center gap-3 p-4 ${activeTab === 'houses' ? 'bg-primary-100 text-primary' : 'hover:bg-default-100'}`}
                >
                  <Icon icon="lucide:home" />
                  <span>My Houses</span>
                </button>
                <button 
                  onClick={() => handleTabChange('security')}
                  className={`flex items-center gap-3 p-4 ${activeTab === 'security' ? 'bg-primary-100 text-primary' : 'hover:bg-default-100'}`}
                >
                  <Icon icon="lucide:shield" />
                  <span>Security</span>
                </button>
                <button 
                  onClick={() => handleTabChange('preferences')}
                  className={`flex items-center gap-3 p-4 ${activeTab === 'preferences' ? 'bg-primary-100 text-primary' : 'hover:bg-default-100'}`}
                >
                  <Icon icon="lucide:settings" />
                  <span>Preferences</span>
                </button>
              </div>
            </CardBody>
          </Card>
          
          {/* Mobile Tabs */}
          <div className="flex md:hidden justify-center overflow-x-auto mb-4 border-b border-default-200">
            <button 
              onClick={() => handleTabChange('account')}
              className={`flex-shrink-0 py-3 px-4 border-b-2 ${activeTab === 'account' ? 'border-primary text-primary' : 'border-transparent text-default-500'}`}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:user" className="text-xl" />
                <span className="text-xs mt-1">Account</span>
              </div>
            </button>
            <button 
              onClick={() => handleTabChange('houses')}
              className={`flex-shrink-0 py-3 px-4 border-b-2 ${activeTab === 'houses' ? 'border-primary text-primary' : 'border-transparent text-default-500'}`}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:home" className="text-xl" />
                <span className="text-xs mt-1">Houses</span>
              </div>
            </button>
            <button 
              onClick={() => handleTabChange('security')}
              className={`flex-shrink-0 py-3 px-4 border-b-2 ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-default-500'}`}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:shield" className="text-xl" />
                <span className="text-xs mt-1">Security</span>
              </div>
            </button>
            <button 
              onClick={() => handleTabChange('preferences')}
              className={`flex-shrink-0 py-3 px-4 border-b-2 ${activeTab === 'preferences' ? 'border-primary text-primary' : 'border-transparent text-default-500'}`}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:settings" className="text-xl" />
                <span className="text-xs mt-1">Settings</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {activeTab === 'account' && 'Account Information'}
                {activeTab === 'houses' && 'My Houses'}
                {activeTab === 'security' && 'Security Settings'}
                {activeTab === 'preferences' && 'Preferences'}
              </h2>
              {activeTab === 'account' && !isEditing && (
                <Button 
                  variant="light" 
                  color="primary" 
                  startContent={<Icon icon="lucide:edit" />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
              {activeTab === 'houses' && (
                <Button 
                  variant="light" 
                  color="primary" 
                  startContent={<Icon icon="lucide:plus" />}
                >
                  Add Property
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-6">
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={profileForm.firstName}
                      onValueChange={(value) => handleInputChange('firstName', value)}
                      variant="bordered"
                      isDisabled={!isEditing}
                    />
                    <Input
                      label="Last Name"
                      value={profileForm.lastName}
                      onValueChange={(value) => handleInputChange('lastName', value)}
                      variant="bordered"
                      isDisabled={!isEditing}
                    />
                  </div>
                  
                  <Input
                    label="Email"
                    type="email"
                    value={profileForm.email}
                    onValueChange={(value) => handleInputChange('email', value)}
                    variant="bordered"
                    startContent={<Icon icon="lucide:mail" />}
                    isDisabled={true} // Email is typically not editable
                  />
                  
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={profileForm.phoneNumber}
                    onValueChange={(value) => handleInputChange('phoneNumber', value)}
                    variant="bordered"
                    startContent={<Icon icon="lucide:phone" />}
                    isDisabled={!isEditing}
                  />
                  
                  {isEditing && (
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="bordered" 
                        onClick={() => setIsEditing(false)}
                        isDisabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button 
                        color="primary"
                        onClick={handleSaveProfile}
                        isLoading={isSaving}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'houses' && (
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
              )}
              
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <p className="text-default-500 mb-4">
                    Manage your password and security settings here.
                  </p>
                  
                  <div className="p-4 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Password</h3>
                        <p className="text-default-500 text-sm">Last changed 3 months ago</p>
                      </div>
                      <Button variant="light">Change Password</Button>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Two-Factor Authentication</h3>
                        <p className="text-default-500 text-sm">Enhance your account security</p>
                      </div>
                      <Button variant="light" color="primary">Enable</Button>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <p className="text-default-500 mb-4">
                    Customize your experience with these preferences.
                  </p>
                  
                  <div className="p-4 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Email Notifications</h3>
                        <p className="text-default-500 text-sm">Receive updates and offers</p>
                      </div>
                      <Button variant="light">Manage</Button>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Language</h3>
                        <p className="text-default-500 text-sm">Current: English</p>
                      </div>
                      <Button variant="light">Change</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}; 