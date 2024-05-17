import { TFunction, useTranslation } from '@tyro/i18n';
import {
  ActionMenu,
  GridOptions,
  ICellRendererParams,
  PageContainer,
  PageHeading,
  ReturnTypeDisplayName,
  Table,
  getColourBasedOnAttendanceType,
  usePreferredNameLayout,
  commonActionMenuProps,
  RHFDatePicker,
  useFormValidator,
} from '@tyro/core';
import { useMemo, useState } from 'react';
import { AttendanceCode, Person, SmsRecipientType } from '@tyro/api';
import dayjs from 'dayjs';
import { Button, Chip, Stack, ChipProps, Fade, Box } from '@mui/material';
import { AddIcon, MobileIcon } from '@tyro/icons';
import { RecipientsForSmsModal, SendSmsModal } from '@tyro/sms';
import { useForm } from 'react-hook-form';
import CreateSignInOutModal, {
  SignStatus,
} from '../components/sign-in-out/create-sign-in-out-modal';
import SignInOutActionMenu from '../components/sign-in-out/sign-in-out-action-menu';

export type CellData = {
  id: number;
  class: string;
  student: Person;
  attendanceCodes: AttendanceCode[];
  status: SignStatus;
  date?: dayjs.Dayjs;
  note?: string;
  completedBy: Person;
};

export type FilterSignInOutFormState = {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

const getColumns = (
  t: TFunction<
    ('common' | 'attendance')[],
    undefined,
    ('common' | 'attendance')[]
  >,
  displayName: ReturnTypeDisplayName,
  handleDeleteRow: (id: number) => void,
  handleSendSMS: (data: CellData) => void
): GridOptions<CellData>['columnDefs'] => [
  {
    headerName: t('attendance:studentName'),
    valueGetter: ({ data }) => displayName(data?.student),
    checkboxSelection: true,
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true,
  },
  {
    field: 'class',
    headerName: t('common:class'),
    filter: true,
  },
  {
    field: 'date',
    headerName: t('common:time'),
    valueGetter: ({ data }) => data?.date?.format('HH:mm'),
  },
  {
    field: 'note',
    headerName: t('common:note'),
    valueGetter: ({ data }) => data?.note || '-',
  },
  {
    field: 'status',
    filter: true,
    headerName: t('common:status'),
    cellRenderer: ({ data }: ICellRendererParams<CellData>) => {
      const colorMapping: Record<SignStatus, ChipProps['color']> = {
        [SignStatus.SignIn]: 'success',
        [SignStatus.SignOut]: 'error',
      };
      return (
        data?.status && (
          <Chip
            variant="soft"
            size="small"
            label={t(`attendance:shortSignStatus.${data.status}`)}
            color={colorMapping[data.status]}
          />
        )
      );
    },
  },
  {
    field: 'completedBy',
    filter: true,
    headerName: t('attendance:completedBy'),
    valueGetter: ({ data }) => displayName(data?.completedBy),
  },
  {
    headerName: t('common:attendance'),
    filter: true,
    cellRenderer: ({ data }: ICellRendererParams<CellData>) => (
      <Stack gap={1} direction="row">
        {data?.attendanceCodes.map((attendance) => (
          <Chip
            variant="soft"
            size="small"
            key={attendance.id}
            color={
              getColourBasedOnAttendanceType(attendance.sessionCodeType)
                .base as ChipProps['color']
            }
            label={attendance.name}
          />
        ))}
      </Stack>
    ),
    hide: true,
  },
  {
    field: 'date',
    filter: true,
    headerName: t('common:year'),
    valueGetter: ({ data }) => data?.date?.format('YYYY'),
    hide: true,
  },
  {
    field: 'date',
    headerName: t('common:date'),
    valueGetter: ({ data }) => data?.date?.format('L'),
    hide: true,
  },
  {
    ...commonActionMenuProps,
    cellRenderer: ({ data }: ICellRendererParams<CellData>) =>
      data && (
        <SignInOutActionMenu
          onClickSendSMS={() => handleSendSMS(data)}
          onClickEdit={() => {}}
          onClickDelete={() => handleDeleteRow(data.id)}
        />
      ),
  },
];

export default function SignInOut() {
  const { t } = useTranslation([
    'common',
    'attendance',
    'people',
    'mail',
    'sms',
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [rowData, setRowData] = useState<CellData[]>([]);
  const [selectedRows, setSelectedRows] = useState<CellData[]>([]);
  const { displayName } = usePreferredNameLayout();
  const [isSendSmsOpen, setIsSendSMSOpen] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<RecipientsForSmsModal>([]);
  const { resolver, rules } = useFormValidator<FilterSignInOutFormState>();
  const { control, handleSubmit } = useForm<FilterSignInOutFormState>({
    resolver: resolver({
      startDate: [rules.date(), rules.required()],
      endDate: [
        rules.required(),
        rules.date(t('common:errorMessages.invalidDate')),
        rules.afterStartDate(
          'startDate',
          t('common:errorMessages.afterStartDate')
        ),
      ],
    }),
    defaultValues: {
      startDate: dayjs(),
      endDate: dayjs(),
    },
  });

  const handleSendSMS = ({ student }: CellData) => {
    setIsSendSMSOpen(true);

    setSmsRecipients([
      {
        id: student.partyId,
        name: displayName(student),
        type: 'individual',
        avatarUrl: student.avatarUrl,
      },
    ]);
  };

  const handleDeleteRow = (id: number) => {
    setRowData((prevState) => prevState.filter((row) => row.id !== id));
  };

  const columns = useMemo(
    () => getColumns(t, displayName, handleDeleteRow, handleSendSMS),
    [t, displayName]
  );

  const onSubmit = () => {};

  return (
    <PageContainer title={t('attendance:signInOut')}>
      <PageHeading
        title={t('attendance:signInOut')}
        titleProps={{ variant: 'h3' }}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack direction="row" gap={2} alignItems="center">
          <RHFDatePicker
            inputProps={{
              variant: 'white-filled',
            }}
            label={t('common:startDate')}
            controlProps={{
              name: 'startDate',
              control,
            }}
          />
          <RHFDatePicker
            inputProps={{
              variant: 'white-filled',
            }}
            label={t('common:endDate')}
            controlProps={{
              name: 'endDate',
              control,
            }}
          />
          <Button variant="contained">{t('common:actions.filter')}</Button>
        </Stack>
      </form>
      <Table
        rowData={rowData}
        columnDefs={columns}
        getRowId={({ data }) => String(data?.id)}
        rowSelection="multiple"
        onRowSelection={setSelectedRows}
        rightAdornment={
          <Stack gap={2} direction="row" alignItems="center">
            <Fade in={selectedRows.length > 0} unmountOnExit>
              <Box>
                <ActionMenu
                  menuItems={[
                    {
                      label: t('people:sendSms'),
                      icon: <MobileIcon />,
                      onClick: () => {
                        setIsSendSMSOpen(true);
                        setSmsRecipients(
                          selectedRows.map(({ student }) => ({
                            id: student.partyId,
                            name: displayName(student),
                            type: 'individual',
                            avatarUrl: student.avatarUrl,
                          }))
                        );
                      },
                    },
                  ]}
                />
              </Box>
            </Fade>
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setIsOpen(true);
              }}
              variant="contained"
            >
              {t('common:createNew')}
            </Button>
          </Stack>
        }
      />
      <CreateSignInOutModal
        open={isOpen}
        setRowData={setRowData}
        onClose={() => {
          setIsOpen(false);
        }}
      />
      <SendSmsModal
        isOpen={isSendSmsOpen}
        onClose={() => setIsSendSMSOpen(false)}
        possibleRecipientTypes={[
          {
            label: t('sms:contactsOfStudent', {
              count: selectedRows.length,
            }),
            type: SmsRecipientType.Student,
          },
          {
            label: t('sms:subjectTeachersOfStudent', {
              count: selectedRows.length,
            }),
            type: SmsRecipientType.StudentTeachers,
          },
        ]}
        recipients={smsRecipients}
      />
    </PageContainer>
  );
}
