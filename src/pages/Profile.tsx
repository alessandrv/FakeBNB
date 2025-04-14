import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Tabs, Tab, Avatar, Spinner, Badge, Divider, User, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tooltip, Spacer, Skeleton } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';

// Define interfaces for house management
interface Tenant {
  id: string;
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
  name: string;
  address: string;
  occupants: number;
  status: "occupied" | "vacant";
  tenants: Tenant[];
  monthlyRent: number;
  image: string;
}

interface User {
  // ... existing code ...
}

// Sample placeholder tenant for testing
const placeholderTenant: Tenant = {
  id: "test-tenant-1",
  name: "Jane Smith",
  avatar: "https://i.pravatar.cc/150?u=test-tenant-1",
  email: "jane.smith@example.com",
  phone: "555-123-4567",
  moveInDate: "2023-01-15",
  paymentStatus: "paid",
  lastPaymentDate: "2023-05-01",
  rentAmount: 1200,
  paymentHistory: [
    {
      date: "2023-05-01",
      amount: 1200,
      status: "completed"
    },
    {
      date: "2023-04-01",
      amount: 1200,
      status: "completed"
    },
    {
      date: "2023-03-01",
      amount: 1200,
      status: "pending"
    }
  ]
};

// Second placeholder tenant for testing
const placeholderTenant2: Tenant = {
  id: "test-tenant-2",
  name: "John Davis",
  avatar: "https://i.pravatar.cc/150?u=test-tenant-2",
  email: "john.davis@example.com",
  phone: "555-987-6543",
  moveInDate: "2023-02-05",
  paymentStatus: "pending",
  lastPaymentDate: "2023-05-03",
  rentAmount: 1000,
  paymentHistory: [
    {
      date: "2023-05-03",
      amount: 1000,
      status: "pending"
    },
    {
      date: "2023-04-02",
      amount: 1000,
      status: "completed"
    },
    {
      date: "2023-03-02",
      amount: 1000,
      status: "completed"
    }
  ]
};

// Define a HouseCard component for the Profile page
const HouseCard = ({ house }: { house: House }) => {
  const navigate = useNavigate();
  
  const handleEditHouse = (e: React.MouseEvent, houseId: string) => {
    e.stopPropagation();
    navigate(`/edit-house/${houseId}`);
  };
  
  const handleViewTenants = (e: React.MouseEvent, tenants: Tenant[]) => {
    e.stopPropagation();
    // You can implement tenant details view logic here
  };
  
  return (
    <Card 
      className="w-full cursor-pointer transform transition-transform hover:scale-[1.02]"
      isPressable
      onPress={() => navigate(`/property/${house.id}`)}
    >
      <CardBody>
        <div className="relative">
          <div className="w-full aspect-square mb-3 overflow-hidden rounded-lg">
            <img 
              src={house.image} 
              alt={house.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
          
        <div className="mb-2">
          <h3 className="font-semibold text-lg truncate">{house.name}</h3>
          <p className="text-default-500 text-sm truncate">
            {house.address}
          </p>
          <p className="text-default-500 text-sm mt-1">
            ${house.monthlyRent}/month • {house.occupants} {house.occupants === 1 ? 'tenant' : 'tenants'}
          </p>
        </div>
          
        <div className="flex justify-between mt-4">
          <Button 
            size="sm" 
            color="primary" 
            variant="flat"
            startContent={<Icon icon="lucide:edit" />}
            onClick={(e) => handleEditHouse(e, house.id)}
          >
            Edit
          </Button>
          
          <Button 
            size="sm" 
            variant="light"
            startContent={<Icon icon="lucide:users" />}
            onClick={(e) => handleViewTenants(e, house.tenants)}
          >
            Tenants ({house.tenants.length})
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export const Profile = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileDataLoading, setProfileDataLoading] = useState(true);
  const [housesDataLoading, setHousesDataLoading] = useState(true);
  
  // Get tab from URL query parameter or default to 'account'
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return tab && ['account', 'houses', 'security', 'preferences'].includes(tab) ? tab : 'account';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  // Update the function signatures to accept any event type
  const handleEditHouse = (e: any, houseId: string) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    navigate(`/edit-house/${houseId}`);
  };
  
  const handleViewHouse = (e: any, houseId: string) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    navigate(`/property/${houseId}`);
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
  const { isOpen: isLogoutOpen, onOpen: onLogoutOpen, onClose: onLogoutClose } = useDisclosure();
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const contentControls = useAnimation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  
  // Define tab order for swipe navigation
  const tabOrder = ['account', 'houses', 'security', 'preferences'];
  
  // The minimum swipe distance required (in px)
  const minSwipeDistance = 80; // Increased for more intentional swipes
  
  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null); // Reset touchEnd values
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };
  
  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };
  
  // Handle touch end
  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX || !touchStartY || !touchEndY) return;
    
    const horizontalDistance = touchStartX - touchEndX;
    const verticalDistance = Math.abs(touchStartY - touchEndY);
    
    // Only register horizontal swipes when:
    // 1. Horizontal distance is greater than minimum threshold
    // 2. Horizontal movement is at least 2x the vertical movement
    // 3. Vertical movement is not too large (prevents swipes during scrolling)
    const isHorizontalSwipe = 
      Math.abs(horizontalDistance) > minSwipeDistance && 
      Math.abs(horizontalDistance) > verticalDistance * 2 &&
      verticalDistance < 50;
    
    // Find current tab index
    const currentIndex = tabOrder.indexOf(activeTab);
    
    if (isHorizontalSwipe) {
      if (horizontalDistance > 0 && currentIndex < tabOrder.length - 1) {
        // Swipe left to go to next tab
        handleTabChange(tabOrder[currentIndex + 1]);
      } else if (horizontalDistance < 0 && currentIndex > 0) {
        // Swipe right to go to previous tab
        handleTabChange(tabOrder[currentIndex - 1]);
      }
    }
  };
  
  // Show a visual indicator when a swipe is detected
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(false);
  
  // Handle touch move to show visual feedback
  const handleTouchMove = (e: React.TouchEvent) => {
    onTouchMove(e);
    
    // Show visual indicator if it's likely to be a horizontal swipe
    if (touchStartX && touchStartY) {
      const currentX = e.targetTouches[0].clientX;
      const currentY = e.targetTouches[0].clientY;
      
      const horizontalDist = Math.abs(touchStartX - currentX);
      const verticalDist = Math.abs(touchStartY - currentY);
      
      if (horizontalDist > 30 && horizontalDist > verticalDist * 1.5) {
        setShowSwipeIndicator(true);
      } else {
        setShowSwipeIndicator(false);
      }
    }
  };
  
  // Reset swipe indicator when touch ends
  const handleTouchEnd = () => {
    onTouchEnd();
    setShowSwipeIndicator(false);
  };
  
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

  // Simulate data loading
  useEffect(() => {
    // Simulate API loading time
    const timer = setTimeout(() => {
      setProfileDataLoading(false);
      setHousesDataLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Replace the sample houses data with state and useEffect to fetch real data
  const [houses, setHouses] = useState<House[]>([]);
  const [housesError, setHousesError] = useState<string | null>(null);

  // Fetch houses when the component mounts
  useEffect(() => {
    const fetchHouses = async () => {
      setHousesDataLoading(true);
      setHousesError(null);
      
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication required');
        }
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/houses/user/with-guests`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch houses');
        }
        
        const housesData = await response.json();
        
        // Transform the API response to match our component's expected format
        const transformedHouses = housesData.map((house: any) => {
          // Get first image as the main house image, or use a placeholder
          const mainImage = house.photos && house.photos.length > 0 
            ? `${apiUrl}/api/images/${house.photos[0]}` 
            : "https://picsum.photos/seed/house1/400/300";
          
          // Transform tenants data
          const transformedTenants = (house.tenants || []).map((tenant: any) => ({
            name: `${tenant.first_name} ${tenant.last_name}`,
            avatar: tenant.avatar || `https://i.pravatar.cc/150?u=${tenant.id}`,
            email: tenant.email || "",
            phone: tenant.phone || "",
            moveInDate: tenant.move_in_date,
            paymentStatus: tenant.payment_status || "pending",
            lastPaymentDate: tenant.last_payment_date || new Date().toISOString().split('T')[0],
            rentAmount: tenant.monthly_rent,
            paymentHistory: (tenant.payment_history || []).map((payment: any) => ({
              date: payment.payment_date,
              amount: payment.amount,
              status: payment.status
            }))
          }));
          
          // Add placeholder tenant for testing if no tenants exist
          const finalTenants = transformedTenants.length > 0 ? transformedTenants : [];
          
          return {
            id: house.id.toString(),
            name: house.name || `Property ${house.id}`,
            address: house.address,
            occupants: parseInt(house.occupants) || 0,
            status: house.status || (transformedTenants.length > 0 ? "occupied" : "vacant"),
            monthlyRent: parseFloat(house.monthly_rent) || 0,
            image: mainImage,
            tenants: finalTenants
          };
        });
        
        // Add a house with a placeholder tenant for testing
        const houseWithPlaceholder = {
          id: "test-property-1",
          name: "Test Property",
          address: "123 Test Street, Testville",
          occupants: 2, // Updated to reflect 2 tenants
          status: "occupied",
          monthlyRent: 1200,
          image: "https://picsum.photos/seed/test1/400/300",
          tenants: [placeholderTenant, placeholderTenant2] // Added second tenant
        };
        
        setHouses([...transformedHouses, houseWithPlaceholder]);
      } catch (error) {
        console.error('Error fetching houses:', error);
        setHousesError('Failed to load houses. Please try again.');
      } finally {
        setHousesDataLoading(false);
      }
    };
    
    fetchHouses();
  }, []);

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

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!changePasswordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!changePasswordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (changePasswordForm.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/\d/.test(changePasswordForm.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    } else if (!/[a-zA-Z]/.test(changePasswordForm.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one letter';
    }
    
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;
    
    setIsChangingPassword(true);
    setPasswordSuccessMessage(null); // Reset success message
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const fetchResponse = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
          confirmPassword: changePasswordForm.confirmPassword
        })
      });

      const responseData = await fetchResponse.json();

      if (!fetchResponse.ok) {
        if (responseData.message === 'Current password is incorrect') {
          setPasswordErrors({ currentPassword: 'Incorrect current password' });
        } else if (responseData.errors) {
          // Handle validation errors from backend
          const newErrors: Record<string, string> = {};
          responseData.errors.forEach((error: { param: string; msg: string }) => {
            if (error.param === 'currentPassword') {
              newErrors.currentPassword = error.msg;
            } else if (error.param === 'newPassword') {
              newErrors.newPassword = error.msg;
            } else if (error.param === 'confirmPassword') {
              newErrors.confirmPassword = error.msg;
            }
          });
          setPasswordErrors(newErrors);
        } else {
          throw new Error(responseData.message || 'Failed to change password');
        }
        return;
      }

      // Reset form and close modal
      setChangePasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
      setIsChangePasswordOpen(false);
      
      // Set success message
      setPasswordSuccessMessage('Password changed successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordErrors({ general: 'Failed to change password. Please try again.' });
    } finally {
      setIsChangingPassword(false);
    }
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

  // Animation variants
  const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  // Profile skeleton component
  const ProfileSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
      <Skeleton className="h-14 rounded-lg" />
      <Skeleton className="h-14 rounded-lg" />
    </div>
  );

  // House card skeleton component
  const HouseCardSkeleton = () => (
    <Card className="w-full">
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
          <Skeleton className="w-full h-48 rounded-lg" />
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="w-full">
                <Skeleton className="h-6 w-3/4 rounded-lg mb-2" />
                <Skeleton className="h-4 w-1/3 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Card className="w-full">
                <CardBody>
                  <div className="flex flex-col gap-3">
                    <div className="border-b pb-3">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-12 w-40 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-12 w-40 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  // Security skeleton component
  const SecuritySkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-4 w-3/4 rounded-lg mb-4" />
      <Skeleton className="h-24 rounded-lg mb-4" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );

  // Preferences skeleton component
  const PreferencesSkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-4 w-3/4 rounded-lg mb-4" />
      <Skeleton className="h-24 rounded-lg mb-4" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );

  return (
    <div className="container mx-auto pb-24 py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Button 
          color="danger" 
          variant="flat"
          startContent={<Icon icon="lucide:log-out" />}
          onClick={onLogoutOpen}
        >
          Logout
        </Button>
      </div>
      
      {/* Logout Confirmation Modal */}
      <Modal isOpen={isLogoutOpen} onClose={onLogoutClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirm Logout
              </ModalHeader>
              <ModalBody>
                <p>Are you sure you want to logout?</p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={handleLogout}>
                  Logout
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
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
      
      {/* Change Password Modal */}
      <Modal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Change Password
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                type="password"
                label="Current Password"
                value={changePasswordForm.currentPassword}
                onValueChange={(value) => setChangePasswordForm({ ...changePasswordForm, currentPassword: value })}
                errorMessage={passwordErrors.currentPassword}
                isInvalid={!!passwordErrors.currentPassword}
                startContent={<Icon icon="lucide:lock" className="text-default-400" />}
              />
              <Input
                type="password"
                label="New Password"
                value={changePasswordForm.newPassword}
                onValueChange={(value) => setChangePasswordForm({ ...changePasswordForm, newPassword: value })}
                errorMessage={passwordErrors.newPassword}
                isInvalid={!!passwordErrors.newPassword}
                startContent={<Icon icon="lucide:key" className="text-default-400" />}
              />
              <Input
                type="password"
                label="Confirm New Password"
                value={changePasswordForm.confirmPassword}
                onValueChange={(value) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: value })}
                errorMessage={passwordErrors.confirmPassword}
                isInvalid={!!passwordErrors.confirmPassword}
                startContent={<Icon icon="lucide:key" className="text-default-400" />}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={() => setIsChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={handlePasswordChange}
              isLoading={isChangingPassword}
            >
              Change Password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left sidebar */}
        <div>
          <Card className="mb-6">
            <CardBody className="flex flex-col items-center p-6">
              {profileDataLoading ? (
                <>
                  <Skeleton className="w-16 h-16 rounded-full mb-4" />
                  <div className="text-center w-full">
                    <Skeleton className="h-6 w-3/4 mx-auto mb-2 rounded-lg" />
                    <Skeleton className="h-4 w-1/2 mx-auto rounded-lg" />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </CardBody>
          </Card>
          
          <Card className="hidden md:block">
            <CardBody className="p-0">
              <div className="flex flex-col">
                <motion.button 
                  onClick={() => handleTabChange('account')}
                  className="flex items-center gap-3 p-4 relative"
                  initial={false}
                  animate={{ 
                    color: activeTab === 'account' ? 'var(--primary)' : 'inherit'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon icon="lucide:user" />
                  <span>Account</span>
                  {activeTab === 'account' && (
                    <motion.div
                      className="absolute inset-0 bg-primary-100 -z-10"
                      layoutId="tabHighlight"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
                <motion.button 
                  onClick={() => handleTabChange('houses')}
                  className="flex items-center gap-3 p-4 relative"
                  initial={false}
                  animate={{ 
                    color: activeTab === 'houses' ? 'var(--primary)' : 'inherit'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon icon="lucide:home" />
                  <span>My Houses</span>
                  {activeTab === 'houses' && (
                    <motion.div
                      className="absolute inset-0 bg-primary-100 -z-10"
                      layoutId="tabHighlight"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
                <motion.button 
                  onClick={() => handleTabChange('security')}
                  className="flex items-center gap-3 p-4 relative"
                  initial={false}
                  animate={{ 
                    color: activeTab === 'security' ? 'var(--primary)' : 'inherit'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon icon="lucide:shield" />
                  <span>Security</span>
                  {activeTab === 'security' && (
                    <motion.div
                      className="absolute inset-0 bg-primary-100 -z-10"
                      layoutId="tabHighlight"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
                <motion.button 
                  onClick={() => handleTabChange('preferences')}
                  className="flex items-center gap-3 p-4 relative"
                  initial={false}
                  animate={{ 
                    color: activeTab === 'preferences' ? 'var(--primary)' : 'inherit'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon icon="lucide:settings" />
                  <span>Preferences</span>
                  {activeTab === 'preferences' && (
                    <motion.div
                      className="absolute inset-0 bg-primary-100 -z-10"
                      layoutId="tabHighlight"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              </div>
            </CardBody>
          </Card>
          
          {/* Mobile Tabs */}
          <div className="flex md:hidden justify-center overflow-x-auto mb-4 border-b border-default-200">
            <motion.button 
              onClick={() => handleTabChange('account')}
              className="flex-shrink-0 py-3 px-4 border-b-2 border-transparent relative"
              initial={false}
              animate={{ 
                color: activeTab === 'account' ? 'var(--primary)' : 'var(--default-500)'
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:user" className="text-xl" />
                <span className="text-xs mt-1">Account</span>
              </div>
              {activeTab === 'account' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="mobileTabIndicator"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button 
              onClick={() => handleTabChange('houses')}
              className="flex-shrink-0 py-3 px-4 border-b-2 border-transparent relative"
              initial={false}
              animate={{ 
                color: activeTab === 'houses' ? 'var(--primary)' : 'var(--default-500)'
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:home" className="text-xl" />
                <span className="text-xs mt-1">Houses</span>
              </div>
              {activeTab === 'houses' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="mobileTabIndicator"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button 
              onClick={() => handleTabChange('security')}
              className="flex-shrink-0 py-3 px-4 border-b-2 border-transparent relative"
              initial={false}
              animate={{ 
                color: activeTab === 'security' ? 'var(--primary)' : 'var(--default-500)'
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:shield" className="text-xl" />
                <span className="text-xs mt-1">Security</span>
              </div>
              {activeTab === 'security' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="mobileTabIndicator"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button 
              onClick={() => handleTabChange('preferences')}
              className="flex-shrink-0 py-3 px-4 border-b-2 border-transparent relative"
              initial={false}
              animate={{ 
                color: activeTab === 'preferences' ? 'var(--primary)' : 'var(--default-500)'
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center">
                <Icon icon="lucide:settings" className="text-xl" />
                <span className="text-xs mt-1">Settings</span>
              </div>
              {activeTab === 'preferences' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="mobileTabIndicator"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Main content */}
        <div 
          className="lg:col-span-3 relative"
          ref={contentRef}
          onTouchStart={onTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe direction indicators */}
          {showSwipeIndicator && (
            <div className="absolute inset-y-0 left-0 w-16 z-10 flex items-center justify-start opacity-30 pointer-events-none">
              {touchStartX && touchEndX && touchEndX < touchStartX && (
                <div className="text-3xl text-primary">
                  <Icon icon="lucide:chevron-left" width={36} />
                </div>
              )}
            </div>
          )}
          
          {showSwipeIndicator && (
            <div className="absolute inset-y-0 right-0 w-16 z-10 flex items-center justify-end opacity-30 pointer-events-none">
              {touchStartX && touchEndX && touchEndX > touchStartX && (
                <div className="text-3xl text-primary">
                  <Icon icon="lucide:chevron-right" width={36} />
                </div>
              )}
            </div>
          )}
          
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {activeTab === 'account' && 'Account Information'}
                {activeTab === 'houses' && 'My Houses'}
                {activeTab === 'security' && 'Security Settings'}
                {activeTab === 'preferences' && 'Preferences'}
              </h2>
              {activeTab === 'account' && !isEditing && !profileDataLoading && (
                <Button 
                  variant="light" 
                  color="primary" 
                  startContent={<Icon icon="lucide:edit" />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
              {activeTab === 'houses' && !housesDataLoading && (
                <Link to="/create-house" className="flex items-center gap-2">
                  <Button 
                    variant="light" 
                    color="primary" 
                    startContent={<Icon icon="lucide:plus" />}
                  >
                    <span>Add Property</span>
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardBody className="p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'account' && (
                  <motion.div 
                    key="account"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                    className="space-y-6"
                  >
                    {profileDataLoading ? (
                      <ProfileSkeleton />
                    ) : (
                      <>
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
                      </>
                    )}
                  </motion.div>
                )}
                
                {activeTab === 'houses' && (
                  <motion.div 
                    key="houses"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                    className="space-y-6"
                  >
                    {housesDataLoading ? (
                      <>
                        <HouseCardSkeleton />
                        <HouseCardSkeleton />
                      </>
                    ) : (
                      houses.map((house) => (
                        <Card key={house.id} className="w-full">
                          <CardBody>
                            <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
                              <div className="aspect-square w-full md:w-[300px] h-auto overflow-hidden rounded-lg">
                                <img
                                  src={house.image}
                                  alt={house.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                    <h3 className="text-lg font-semibold">
                                      {house.name}
                                    </h3>
                                    <p className="text-small text-default-500 mt-1">
                                      {house.address}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="flat"
                                      color="secondary"
                                      startContent={<Icon icon="lucide:eye" />}
                                      onPress={(e) => handleViewHouse(e, house.id)}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="flat"
                                      color="primary"
                                      startContent={<Icon icon="lucide:edit" />}
                                      onPress={(e) => handleEditHouse(e, house.id)}
                                    >
                                      Manage
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-medium font-semibold">
                                      Current Tenants
                                    </h4>
                                    <span className="text-small text-default-500">
                                      {house.occupants} {house.occupants === 1 ? 'occupant' : 'occupants'}
                                    </span>
                                  </div>

                                  <Card className="w-full">
                                    <CardBody>
                                      <div className="flex flex-col gap-3">
                                        {house.tenants.length > 0 ? (
                                          house.tenants.map((tenant, index) => (
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
                                          ))
                                        ) : (
                                          <div className="flex flex-col items-center justify-center py-8">
                                            <Icon icon="lucide:users" className="text-4xl text-default-300 mb-2" />
                                            <p className="text-default-500">No tenants</p>
                                            <Button 
                                              size="sm" 
                                              variant="flat" 
                                              color="primary" 
                                              className="mt-4" 
                                              startContent={<Icon icon="lucide:user-plus" />}
                                              onPress={(e) => handleEditHouse(e, house.id)}
                                            >
                                              Add Tenant
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </CardBody>
                                  </Card>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))
                    )}
                  </motion.div>
                )}
                
                {activeTab === 'security' && (
                  <motion.div 
                    key="security"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                    className="space-y-6"
                  >
                    {profileDataLoading ? (
                      <SecuritySkeleton />
                    ) : (
                      <>
                        <p className="text-default-500 mb-4">
                          Manage your password and security settings here.
                        </p>
                        
                        {passwordSuccessMessage && (
                          <div className="p-4 mb-4 bg-success-50 text-success-700 rounded-md">
                            {passwordSuccessMessage}
                          </div>
                        )}
                        
                        <div className="p-4 border rounded-md">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold">Password</h3>
                              <p className="text-default-500 text-sm">Last changed 3 months ago</p>
                            </div>
                            <Button 
                              variant="light" 
                              onPress={() => setIsChangePasswordOpen(true)}
                            >
                              Change Password
                            </Button>
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
                      </>
                    )}
                  </motion.div>
                )}
                
                {activeTab === 'preferences' && (
                  <motion.div 
                    key="preferences"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                    className="space-y-6"
                  >
                    {profileDataLoading ? (
                      <PreferencesSkeleton />
                    ) : (
                      <>
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
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
          <Spacer y={4} />
          
          {/* Swipe indicator - shows on mobile only */}
          <div className="flex justify-center mt-2 md:hidden">
            <p className="text-xs text-default-400 flex items-center">
              <Icon icon="lucide:swipe" className="mr-1" />
              Swipe horizontally to change tabs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 