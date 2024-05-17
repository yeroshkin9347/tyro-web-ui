import {
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Dialog,
  DialogTitle,
  RHFDateTimePicker,
  RHFRadioGroup,
  RHFSelect,
  RHFTextField,
  useFormValidator,
} from '@tyro/core';
import { useTranslation } from '@tyro/i18n';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { RHFStudentAutocomplete } from '@tyro/people';
import { AttendanceCode, Person } from '@tyro/api';
import { LoadingButton } from '@mui/lab';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { CellData } from '../../pages/sign-in-out';
import {
  ReturnTypeFromUseStudentSessionAttendance,
  useAttendanceCodes,
  useBellTimesQuery,
  useStudentDailyCalendarInformation,
  useStudentSessionAttendance,
} from '../../api';

export enum SignStatus {
  SignIn = 'SIGN_IN',
  SignOut = 'SIGN_OUT',
}

type AttendanceInput = {
  id: number;
  note: string | null;
  attendanceCodeId: number | null;
};

export type CreateSignInOutFormState = {
  student: Person;
  status: SignStatus;
  date: dayjs.Dayjs;
  note?: string;
  sessionAttendance: Record<string, AttendanceInput>;
  eventAttendance: Record<string, AttendanceInput>;
};

export interface CreateSignInOutModalProps {
  open: boolean;
  onClose: () => void;
  setRowData: Dispatch<SetStateAction<CellData[]>>;
}

export default function CreateSignInOutModal({
  open,
  onClose,
  setRowData,
}: CreateSignInOutModalProps) {
  const { t } = useTranslation(['common', 'attendance']);
  const { resolver, rules } = useFormValidator<CreateSignInOutFormState>();
  const { control, handleSubmit, reset, watch, setValue } =
    useForm<CreateSignInOutFormState>({
      resolver: resolver({
        date: [rules.date(), rules.required()],
        student: [rules.required()],
        note: [rules.maxLength(200)],
      }),
      defaultValues: {
        date: dayjs(),
        status: SignStatus.SignIn,
        eventAttendance: {},
        sessionAttendance: {},
      },
    });
  const formDate = watch('date');
  const formStudent = watch('student');
  const formSessionAttendance = watch('sessionAttendance');
  const formEventAttendance = watch('eventAttendance');
  const day = formDate?.format('YYYY-MM-DD');
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: sessionAttendanceData = [],
    isLoading: isSessionAttendanceLoading,
  } = useStudentSessionAttendance({
    partyIds: [formStudent?.partyId ?? 0],
    from: day,
    to: day,
  });

  const { data: eventAttendance = [], isLoading: isTimetableLoading } =
    useStudentDailyCalendarInformation({
      resources: {
        partyIds: [formStudent?.partyId ?? 0],
      },
      endDate: day,
      startDate: day,
    });

  const { data: bellTimes = [], isLoading: isBelltimesLoading } =
    useBellTimesQuery({
      fromDate: day,
      toDate: day,
    });

  const { data: attendanceCodes = [], isLoading: isAttendanceCodesLoading } =
    useAttendanceCodes({
      teachingGroupCodes: false,
    });

  const bellTimesWithName = useMemo(
    () => (bellTimes || []).filter((bellTime) => bellTime?.name),
    [bellTimes]
  );

  const sessionAttendanceById = useMemo(
    () =>
      sessionAttendanceData?.reduce((acc, current) => {
        acc[current.bellTimeId] = current;

        return acc;
      }, {} as Record<number, ReturnTypeFromUseStudentSessionAttendance[number]>),
    [sessionAttendanceData]
  );

  const handleClose = () => {
    onClose();
    reset();
  };

  const onSubmit = ({
    student,
    status,
    date,
    note,
  }: CreateSignInOutFormState) => {
    setIsLoading(true);

    const sessionAttendanceCodes = Object.values(formSessionAttendance)
      .map((sessionAttendance) =>
        attendanceCodes.find(
          (attendanceCode) =>
            attendanceCode.id === sessionAttendance.attendanceCodeId
        )
      )
      .filter(Boolean) as AttendanceCode[];

    const eventAttendanceCodes = Object.values(formEventAttendance)
      .map((evtAttendance) =>
        attendanceCodes.find(
          (attendanceCode) =>
            attendanceCode.id === evtAttendance.attendanceCodeId
        )
      )
      .filter(Boolean) as AttendanceCode[];

    const formAttendanceCodes: AttendanceCode[] = [
      ...sessionAttendanceCodes,
      ...eventAttendanceCodes,
    ];

    setRowData((prevState) => [
      ...prevState,
      {
        id: Math.floor(Math.random() * 1000000),
        attendanceCodes: formAttendanceCodes,
        status,
        date,
        note,
        student,
        completedBy: student,
        class: '1A',
      },
    ]);
    setIsLoading(false);
    onClose();
  };

  const isAttendanceLoading =
    isTimetableLoading ||
    isBelltimesLoading ||
    isSessionAttendanceLoading ||
    isAttendanceCodesLoading;

  useEffect(() => {
    if (isAttendanceLoading) return;

    bellTimesWithName.forEach((bellTime) => {
      const currentBellTime = sessionAttendanceById?.[bellTime.id];
      const attendanceCodeId = currentBellTime?.attendanceCode?.id || null;

      setValue(`sessionAttendance.${String(bellTime.id)}`, {
        id: bellTime.id,
        note: currentBellTime?.note || null,
        attendanceCodeId,
      });
    });
  }, [isAttendanceLoading, sessionAttendanceById, bellTimesWithName]);

  useEffect(() => {
    if (isAttendanceLoading) return;

    eventAttendance.forEach((event) => {
      const [currentEvent] = event?.extensions?.eventAttendance || [];
      const attendanceCodeId = currentEvent?.attendanceCodeId || null;

      setValue(`eventAttendance.${String(event.eventId)}`, {
        id: event.eventId,
        note: currentEvent?.note || null,
        attendanceCodeId,
      });
    });
  }, [isAttendanceLoading, eventAttendance]);

  useEffect(() => {
    reset();
  }, [open]);

  const isHaveItems = !!bellTimesWithName.length && eventAttendance.length;

  return (
    <Dialog
      open={open}
      scroll="paper"
      fullWidth
      maxWidth="md"
      onClose={handleClose}
    >
      <DialogTitle onClose={handleClose}>
        {t('attendance:createSignInOut')}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack direction="column" sx={{ mt: 1 }} gap={2}>
            <RHFStudentAutocomplete
              label={t('common:student')}
              controlProps={{
                name: `student`,
                control,
              }}
            />
            <RHFRadioGroup
              radioGroupProps={{ sx: { flexDirection: 'row' } }}
              options={[SignStatus.SignIn, SignStatus.SignOut].map(
                (option) => ({
                  value: option,
                  label: t(`attendance:signStatus.${option}`),
                })
              )}
              controlProps={{
                name: 'status',
                control,
              }}
            />
            <RHFDateTimePicker
              label={t('common:date')}
              controlProps={{
                name: 'date',
                control,
              }}
            />
            <RHFTextField
              label={t('attendance:note')}
              controlProps={{
                name: 'note',
                control,
              }}
              textFieldProps={{
                fullWidth: true,
                multiline: true,
                rows: 4,
              }}
            />
            {formStudent &&
              (isAttendanceLoading ? (
                <Stack
                  minHeight="30vh"
                  justifyContent="center"
                  alignItems="center"
                >
                  <CircularProgress />
                </Stack>
              ) : (
                isHaveItems && (
                  <TableContainer>
                    <Table
                      size="small"
                      sx={{
                        mt: 4,
                        '& th': {
                          background: 'transparent',
                          color: 'text.primary',
                          fontWeight: 600,
                        },
                        '& tbody td': {
                          verticalAlign: 'middle',
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          {[
                            t('attendance:time'),
                            t('attendance:type'),
                            t('common:details'),
                            t('attendance:attendance'),
                          ].map((heading) => (
                            <TableCell key={heading}>
                              <Typography
                                color="text.disabled"
                                variant="subtitle2"
                                sx={{ textWrap: 'noWrap' }}
                              >
                                {heading}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody
                        sx={({ palette, spacing }) => ({
                          borderTop: `1px solid ${palette.divider}`,
                          borderBottom: `1px solid ${palette.divider}`,
                          '&::before, &::after': {
                            content: '""',
                            display: 'block',
                            height: spacing(1),
                          },
                        })}
                      >
                        {bellTimesWithName.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Stack direction="row">
                                <Typography
                                  color="text.disabled"
                                  variant="subtitle2"
                                >
                                  {event?.time}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row">
                                <Typography
                                  variant="subtitle2"
                                  sx={{ textWrap: 'noWrap' }}
                                >
                                  {event?.name}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                flexGrow="1"
                                padding={0}
                                sx={{
                                  '& .MuiFormControl-root .MuiInputBase-input':
                                    {
                                      minWidth: { xs: '200px', md: 0 },
                                      paddingY: 1,
                                    },
                                }}
                              >
                                <RHFTextField
                                  textFieldProps={{
                                    fullWidth: true,
                                  }}
                                  controlProps={{
                                    name: `sessionAttendance.${event.id}.note`,
                                    control,
                                  }}
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                padding={0}
                                sx={{
                                  '& .MuiSelect-select': { paddingY: 1 },
                                }}
                              >
                                <RHFSelect
                                  fullWidth
                                  options={attendanceCodes?.filter(
                                    (code) => code?.active
                                  )}
                                  getOptionLabel={(option) => option?.name}
                                  optionIdKey="id"
                                  canDeleteValue
                                  onChange={({ target }) => {
                                    if (!target.value) {
                                      setValue(
                                        `sessionAttendance.${event.id}.note`,
                                        ''
                                      );
                                    }
                                  }}
                                  controlProps={{
                                    name: `sessionAttendance.${event.id}.attendanceCodeId`,
                                    control,
                                  }}
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableBody
                        sx={({ spacing }) => ({
                          '&::before': {
                            content: '""',
                            display: 'block',
                            height: spacing(1),
                          },
                        })}
                      >
                        {eventAttendance?.map((event) => (
                          <TableRow key={event.eventId}>
                            <TableCell>
                              <Stack direction="row">
                                <Typography
                                  color="text.disabled"
                                  variant="subtitle2"
                                >
                                  {dayjs(event?.startTime).format('HH:mm')}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row">
                                <Typography
                                  variant="subtitle2"
                                  sx={{ textWrap: 'noWrap' }}
                                >
                                  {event?.name}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                flexGrow="1"
                                padding={0}
                                sx={{
                                  '& .MuiFormControl-root .MuiInputBase-input':
                                    {
                                      minWidth: { xs: '200px', md: 0 },
                                      paddingY: 1,
                                    },
                                }}
                              >
                                <RHFTextField
                                  textFieldProps={{
                                    fullWidth: true,
                                  }}
                                  controlProps={{
                                    name: `eventAttendance.${event.eventId}.note`,
                                    control,
                                  }}
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                padding={0}
                                sx={{
                                  '& .MuiSelect-select': { paddingY: 1 },
                                }}
                              >
                                <RHFSelect
                                  fullWidth
                                  options={attendanceCodes}
                                  getOptionLabel={(option) => option?.name}
                                  optionIdKey="id"
                                  canDeleteValue
                                  onChange={({ target }) => {
                                    if (!target.value) {
                                      setValue(
                                        `eventAttendance.${event.eventId}.note`,
                                        ''
                                      );
                                    }
                                  }}
                                  controlProps={{
                                    name: `eventAttendance.${event.eventId}.attendanceCodeId`,
                                    control,
                                  }}
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="soft"
            color="inherit"
            onClick={() => {
              handleClose();
            }}
          >
            {t('common:actions.cancel')}
          </Button>
          <LoadingButton type="submit" variant="contained" loading={isLoading}>
            {t('common:actions.save')}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
