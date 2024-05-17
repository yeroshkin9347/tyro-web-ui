import { ActionMenu } from '@tyro/core';
import { useTranslation } from '@tyro/i18n';
import { EditIcon, MobileIcon, TrashIcon, VerticalDotsIcon } from '@tyro/icons';

export interface SignInOutActionMenuProps {
  onClickSendSMS: () => void;
  onClickEdit: () => void;
  onClickDelete: () => void;
}

export default function SignInOutActionMenu({
  onClickSendSMS,
  onClickEdit,
  onClickDelete,
}: SignInOutActionMenuProps) {
  const { t } = useTranslation(['common', 'people', 'mail']);

  return (
    <ActionMenu
      iconOnly
      buttonIcon={<VerticalDotsIcon />}
      menuItems={[
        {
          label: t('people:sendSms'),
          icon: <MobileIcon />,
          onClick: onClickSendSMS,
        },
        {
          label: t('common:actions.edit'),
          icon: <EditIcon />,
          onClick: onClickEdit,
        },
        {
          label: t('common:actions.delete'),
          icon: <TrashIcon />,
          onClick: onClickDelete,
        },
      ]}
    />
  );
}
