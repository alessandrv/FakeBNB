import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Input,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Avatar,
  useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';

export const Header = () => {
  const history = useNavigate();

  return (
    <Navbar maxWidth="xl" isBordered>
      <NavbarBrand>
        <Link as={RouterLink} to="/" className="flex items-center gap-2">
          <Icon icon="lucide:home" className="text-2xl" />
          <p className="font-bold text-inherit">ConnectLivin</p>
        </Link>
      </NavbarBrand>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Input
            placeholder="Search houses..."
            startContent={<Icon icon="lucide:search" />}
            className="w-[300px]"
          />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            as={RouterLink}
            to="/create-house"
            color="primary"
            variant="flat"
            startContent={<Icon icon="lucide:plus" />}
          >
            Add House
          </Button>
        </NavbarItem>
        <NavbarItem>
          <Popover placement="bottom-end">
            <PopoverTrigger>
              <Button
                isIconOnly
                variant="light"
              >
                <Avatar
                  size="sm"
                  src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
                  isBordered
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="p-2 w-48">
                <div className="flex items-center gap-2 p-2 mb-2">
                  <Avatar
                    size="sm"
                    src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-semibold truncate">John Doe</p>
                    <p className="text-tiny text-default-500 truncate">john.doe@example.com</p>
                  </div>
                </div>
                <Button
                  variant="light"
                  startContent={<Icon icon="lucide:settings" />}
                  className="w-full justify-start mb-1"
                  onPress={() => history('/settings')}
                >
                  Settings
                </Button>
                <Button
                  variant="light"
                  startContent={<Icon icon="lucide:help-circle" />}
                  className="w-full justify-start mb-1"
                  onPress={() => history('/faq')}
                >
                  Help
                </Button>
                <Button
                  variant="light"
                  color="danger"
                  startContent={<Icon icon="lucide:log-out" />}
                  className="w-full justify-start"
                >
                  Logout
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};