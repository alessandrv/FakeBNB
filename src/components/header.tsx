import React from 'react';
import { Link as RouterLink, useNavigate} from 'react-router-dom';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Input,
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Avatar,
  useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';

export const Header = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const history = useNavigate();

  return (
    <>
      <Navbar maxWidth="xl" isBordered>
        <NavbarBrand>
          <Link as={RouterLink} to="/" className="flex items-center gap-2">
            <Icon icon="lucide:home" className="text-2xl" />
            <p className="font-bold text-inherit">HomeManager</p>
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
            <Button
              isIconOnly
              variant="light"
              onPress={onOpen}
            >
              <Avatar
                size="sm"
                src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
                isBordered
              />
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <Drawer isOpen={isOpen} onOpenChange={onOpenChange} placement="right">
        <DrawerContent>
          <DrawerHeader className="flex gap-4 items-center">
            <Avatar
              size="lg"
              src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
              isBordered
            />
            <div>
              <h4 className="text-lg font-semibold">John Doe</h4>
              <p className="text-small text-default-500">john.doe@example.com</p>
            </div>
          </DrawerHeader>
          <DrawerBody>
            <div className="flex flex-col gap-2">
              <Button
                variant="light"
                startContent={<Icon icon="lucide:settings" />}
                className="justify-start"
                onPress={() => {
                  history('/settings');
                  onOpenChange(false);
                }}
              >
                Settings
              </Button>
              <Button
                variant="light"
                startContent={<Icon icon="lucide:help-circle" />}
                className="justify-start"
              >
                Help & Support
              </Button>
              <Button
                variant="light"
                color="danger"
                startContent={<Icon icon="lucide:log-out" />}
                className="justify-start"
              >
                Logout
              </Button>
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};