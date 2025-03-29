import React from 'react';
import { Accordion, AccordionItem } from '@heroui/react';

const faqItems = [
  {
    title: "How do I list a new property?",
    content: "You can list a new property by clicking the 'Add House' button in the header. Follow the step-by-step process to provide property details, upload photos, and set your preferences."
  },
  {
    title: "How do I manage tenant payments?",
    content: "You can track and manage tenant payments through the Settings page under 'My Houses'. Each tenant's payment history is available, and you can set up automatic payment reminders."
  },
  {
    title: "Can I have multiple properties?",
    content: "Yes, you can manage multiple properties under a single account. Each property can be managed independently with its own tenants, payment tracking, and settings."
  },
  {
    title: "How do I contact support?",
    content: "You can reach our support team through the Contact page, by email at support@homemanager.com, or by phone at +1 (555) 123-4567. We're available 24/7 to assist you."
  },
  {
    title: "What payment methods are accepted?",
    content: "We accept all major credit cards, bank transfers, and digital payments through our secure payment system. You can manage your payment methods in the Settings page."
  },
  {
    title: "How secure is my information?",
    content: "We use industry-standard encryption and security measures to protect your data. All personal and financial information is encrypted and stored securely."
  }
];

export const Faq = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-default-500">
          Find answers to common questions about using HomeManager
        </p>
      </div>

      <Accordion variant="bordered" className="gap-4">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={index}
            aria-label={item.title}
            title={item.title}
          >
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-12 text-center">
        <p className="text-default-500">
          Still have questions?{' '}
          <a href="/contact" className="text-primary">Contact us</a>
        </p>
      </div>
    </div>
  );
};