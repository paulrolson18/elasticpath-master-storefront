"use client";

import { useState, useEffect } from "react";
import { RadioGroup, Dialog } from "@headlessui/react";
import {
  addAddress,
  associateCartWithAccount,
  createNewQuote,
  createShippingGroup,
  getAccountAddresses,
} from "../../(admin)/admin/quotes/actions";
import {
  CheckIcon,
  EnvelopeIcon,
  HashtagIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import {
  accountAddressesQueryKeys,
  useCart,
} from "../../../react-shopper-hooks";
import { AddAddressForm } from "../../(admin)/admin/quotes/new/AddAddressForm";
import { FormStatusButton } from "../../../components/button/FormStatusButton";
import { StatusButton } from "../../../components/button/StatusButton";
import CartArea from "../../(admin)/admin/quotes/new/CartArea";
import AddCartCustomDiscount from "../../(admin)/admin/quotes/new/AddCartCustomDiscount";
import { getEpccImplicitClient } from "../../../lib/epcc-implicit-client";
import { QuoteSuccessOverlay } from "./QuoteSuccessOverlay";
import { mergeCart } from "../../(auth)/actions";

export default function AccountSelector({
  accountId,
  accountName,
  accountMemberId,
  accountMembers,
  accountsCount,
  accountToken,
}: {
  accountId: string;
  accountName: string;
  accountMemberId: string;
  accountMembers: any;
  accountsCount: number;
  accountToken: string;
}) {
  const [selectedAccountMember, setSelectedAccountMember] =
    useState(accountMemberId);
  const [addresses, setAddresses] = useState<any>();
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");
  const queryClient = useQueryClient();
  const [quoteStarted, setQuoteStarted] = useState(false);
  const { state } = useCart() as any;
  const [openDiscount, setOpenDiscount] = useState(false);
  const [enableCustomDiscount, setEnableCustomDiscount] = useState(false);
  const [loadingCreateQuote, setLoadingCreateQuote] = useState(false);
  const [error, setError] = useState<string>("");
  const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      await fetchAddresses(accountId);
    };
    init();
  }, [accountId]);

  const fetchAddresses = async (accountId: string, addressId?: string) => {
    try {
      const response = await getAccountAddresses(accountId);
      setAddresses(response?.data);
      if (addressId) {
        setSelectedAddress(
          response.data.find((address: any) => address.id === addressId),
        );
      } else if (response?.data?.length > 0) {
        setSelectedAddress(response.data?.[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getCountryName = (country: string) => {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(country.toUpperCase()) || country;
  };

  const handleCreateQuote = async () => {
    if (accountsCount > 1) {
      const client = getEpccImplicitClient();
      const request: any = {
        discount_settings: {
          custom_discounts_enabled: true,
          use_rule_promotions: false,
        },
      };
      await client.Cart(state?.id).UpdateCart(request);
      setEnableCustomDiscount(true);
    }
    setQuoteStarted(true);
  };

  const generateQuoteNumber = () => {
    const randomQuote = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    setQuoteNumber(randomQuote);
  };

  const createQuote = async () => {
    setLoadingCreateQuote(true);
    const request = {
      type: "quote_ext",
      cart_id: state?.id,
      quote_ref: quoteNumber,
      account_id: accountId,
      account_member_id: accountMemberId,
      first_name: selectedAddress.first_name,
      last_name: selectedAddress.last_name,
      email: accountMembers?.find(
        (member: any) => member.id === selectedAccountMember,
      )?.email,
      status: "Created",
      total_items: state?.items?.length,
      total_amount: state?.meta?.display_price?.with_tax.amount,
      currency: state?.meta?.display_price?.with_tax.currency,
    };
    const response = await createNewQuote(state?.id, request);
    if (response?.errors) {
      setError(response?.errors?.[0]?.detail);
    } else {
      const request: any = {
        type: "shipping_group",
        shipping_type: "Standard",
        address: selectedAddress,
      };
      await createShippingGroup(state?.id, request);
      await associateCartWithAccount(state?.id, accountId);
      const client = getEpccImplicitClient();
      const cartRequest: any = {
        name: `# ${quoteNumber}`,
        description: `Quote #${quoteNumber}`,
        is_quote: true,
      };
      await client.Cart(state?.id).UpdateCart(cartRequest);
    }
    setLoadingCreateQuote(false);
    setIsOverlayOpen(true);
  };

  return (
    <>
      {!quoteStarted && (
        <div className="space-y-6 w-full">
          <div className="mb-4 font-bold text-xl">Select Account Member</div>
          <RadioGroup
            value={selectedAccountMember}
            onChange={setSelectedAccountMember}
            className="grid grid-cols-3 gap-4 text-gray-600"
          >
            {accountMembers.map((members: any) => (
              <RadioGroup.Option key={members.id} value={members.id}>
                {({ checked }) => (
                  <div
                    className={`p-4 flex items-center justify-between cursor-pointer border rounded-lg shadow-sm transition hover:shadow-md min-h-20 ${
                      checked ? "border-blue-500 bg-blue-50" : "border-gray-300"
                    }`}
                  >
                    <div>
                      <div className="text-md">{members.name}</div>
                      <div className="text-md mt-2">{members.email}</div>
                    </div>
                    {checked && (
                      <CheckIcon className="w-6 text-brand-primary" />
                    )}
                  </div>
                )}
              </RadioGroup.Option>
            ))}
          </RadioGroup>

          <div className="mb-4 font-bold text-xl">Select Shipping Address</div>
          <RadioGroup
            value={selectedAddress}
            onChange={setSelectedAddress}
            className="grid grid-cols-3 gap-4 text-gray-600"
          >
            {addresses?.map((address: any, index: number) => (
              <RadioGroup.Option key={index} value={address}>
                {({ checked }) => (
                  <div
                    className={`p-4 flex items-center justify-between border rounded-lg shadow-sm cursor-pointer transition hover:shadow-md min-h-52 ${
                      checked
                        ? "border-blue-500 bg-blue-50 text-gray-800"
                        : "border-gray-300"
                    }`}
                  >
                    <span>
                      <p className="font-bold">{address.name}</p>
                      <p>
                        {address.first_name} {address.last_name}
                      </p>
                      <p>{address.line_1}</p>
                      {address.line_2 && <p>{address.line_2}</p>}
                      <p>
                        {address.city}, {address.postcode}
                      </p>
                      <p>{getCountryName(address.country)}</p>
                    </span>
                    {checked && (
                      <CheckIcon className="w-6 text-brand-primary" />
                    )}
                  </div>
                )}
              </RadioGroup.Option>
            ))}
            <div
              className="p-4 border border-dashed border-gray-400 rounded-lg cursor-pointer flex items-center justify-center hover:shadow-md"
              onClick={() => setIsOpen(true)}
            >
              <span className="text-gray-600">+ Add New Address</span>
            </div>
          </RadioGroup>

          <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          >
            <div className="bg-white p-6 rounded-lg shadow-lg w-1/2 space-y-3">
              <h2 className="text-lg font-semibold">Add New Address</h2>
              <form
                action={async (formData) => {
                  const response = await addAddress(formData, accountId);
                  await fetchAddresses(accountId, response?.data?.id);
                  await queryClient.invalidateQueries({
                    queryKey: [
                      ...accountAddressesQueryKeys.list({
                        accountId,
                      }),
                    ],
                  });
                  setIsOpen(false);
                }}
                className="flex flex-col gap-5"
              >
                <AddAddressForm />
                <div className="flex space-x-2">
                  <FormStatusButton
                    type="submit"
                    className="w-full text-md mt-6"
                  >
                    Add Address
                  </FormStatusButton>

                  <StatusButton
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-gray-400 text-white hover:bg-gray-500 text-md mt-6"
                  >
                    Cancel
                  </StatusButton>
                </div>
              </form>
            </div>
          </Dialog>
          {selectedAddress && (
            <div className="flex flex-col items-center justify-center">
              <div className="w-full flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter Quote Number"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="border rounded-lg p-2 w-full "
                />
                <StatusButton
                  onClick={generateQuoteNumber}
                  className="text-sm rounded-lg"
                  variant="secondary"
                >
                  Generate Quote Number
                </StatusButton>
              </div>
              {quoteNumber && (
                <div className="w-full mt-8 flex justify-end">
                  <StatusButton onClick={handleCreateQuote} className="text-sm">
                    Start Quote Process
                  </StatusButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {quoteStarted && selectedAddress && state && (
        <div className="mt-6 w-[90%]">
          <div className="bg-gray-100 px-4 py-6 sm:rounded-lg sm:px-6 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8 lg:py-8">
            <dl className="text-sm lg:col-span-3 lg:mt-0 mb-8 lg:mb-0">
              <div className="flex mb-4">
                <dt className="">
                  <HashtagIcon
                    className="h-6 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="text-sm leading-6 font-medium text-gray-900 ml-4">
                  {quoteNumber}
                </dd>
              </div>
              <div className="flex">
                <dt>
                  <UserCircleIcon
                    className="h-6 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="text-sm font-medium text-gray-900 ml-4">
                  {
                    accountMembers?.find(
                      (member: any) => member.id === selectedAccountMember,
                    )?.name
                  }
                </dd>
              </div>
              <div className="flex mb-4">
                <dt className="">
                  <EnvelopeIcon
                    className="h-6 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="text-sm  text-gray-500 ml-4">
                  {
                    accountMembers?.find(
                      (member: any) => member.id === selectedAccountMember,
                    )?.email
                  }
                </dd>
              </div>
              <div className="flex">
                <dt className="">
                  <UserGroupIcon
                    className="h-6 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </dt>
                <dd className="text-sm  text-gray-500 ml-4">{accountName}</dd>
              </div>
              <div className="mt-10">
                <StatusButton
                  className="text-sm rounded-lg py-2 px-4"
                  variant="secondary"
                  onClick={() => setQuoteStarted(false)}
                >
                  Edit Info
                </StatusButton>
              </div>
            </dl>
            <dl className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-2 md:gap-x-8 lg:col-span-6">
              <div>
                <dt className="font-medium text-gray-900">Shipping address</dt>
                <dd className="mt-3 text-gray-500">
                  <span className="block text-gray-700 mb-1 font-medium">
                    {selectedAddress.name}
                  </span>
                  <span className="block">
                    {selectedAddress.first_name} {selectedAddress.last_name}{" "}
                  </span>
                  <span className="block">{selectedAddress.line_1}</span>
                  {selectedAddress?.line_2 && (
                    <span className="block">{selectedAddress?.line_2}</span>
                  )}
                  <span className="block">
                    {selectedAddress.city}, {selectedAddress.postcode}
                  </span>
                  <span className="block">
                    {getCountryName(selectedAddress.country)}
                  </span>
                </dd>
              </div>
            </dl>
            <dl className="mt-8 divide-y divide-gray-200 text-sm lg:col-span-3 lg:mt-0">
              <div className="flex items-center justify-between py-2">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="font-medium text-gray-900">
                  {state?.meta?.display_price?.without_discount?.formatted}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-gray-600">Tax</dt>
                <dd className="font-medium text-gray-900">
                  {state?.meta?.display_price?.tax?.formatted}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-gray-600">Discount</dt>
                <dd className="font-medium text-gray-900">
                  {state?.meta?.display_price?.discount.formatted}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="font-medium text-gray-900">Order Total</dt>
                <dd className="font-medium text-primary-600">
                  {state?.meta?.display_price?.with_tax.formatted}
                </dd>
              </div>
            </dl>
          </div>
          <CartArea
            enableCustomDiscount={enableCustomDiscount}
            setOpenDiscount={setOpenDiscount}
            selectedAccount={
              accountMembers?.find(
                (member: any) => member.id === selectedAccountMember,
              )?.email
            }
            createQuote={createQuote}
            loadingCreateQuote={loadingCreateQuote}
            error={error}
            accountId={accountId}
          />
          {accountsCount > 1 && (
            <AddCartCustomDiscount
              selectedSalesRep={
                accountMembers?.find(
                  (member: any) => member.id === selectedAccountMember,
                )?.email
              }
              enableCustomDiscount={enableCustomDiscount}
              openDiscount={openDiscount}
              setOpenDiscount={setOpenDiscount}
            />
          )}
          <QuoteSuccessOverlay
            isOpen={isOverlayOpen}
            setIsOpen={setIsOverlayOpen}
            accountId={accountId}
            accountToken={accountToken}
          />
        </div>
      )}
    </>
  );
}
