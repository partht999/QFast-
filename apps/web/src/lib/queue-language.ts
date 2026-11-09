import { isClinicalBusiness, isFoodBusiness } from './business-links';

export type QueueCopy = {
  pageTitle: string;
  pageHint: string;
  steps: [string, string, string];
  addButton: string;
  addTitle: string;
  addHint: string;
  nameLabel: string;
  namePlaceholder: string;
  peopleNoun: string;
  waitingStat: string;
  waitingHint: string;
  doneStat: string;
  doneHint: string;
  waitSetting: string;
  waitHint: string;
  graceSetting: string;
  graceHint: string;
  readyLabel: string;
  nowLabel: string;
  nextPrefix: string;
  emptyNow: string;
  readyDetail: string;
  callNext: (tokenNumber: number) => string;
  finish: string;
  recall: string;
  listTitle: string;
  listHint: string;
  emptyTitle: string;
  emptyBody: string;
  skippedEmpty: string;
  skippedHint: string;
  assignLabel: string;
  addLine: string;
  addLineTitle: string;
  addLineHint: string;
  lineName: string;
  lineNamePlaceholder: string;
  showStaff: boolean;
  staffLabel: string;
  staffPlaceholder: string;
  showDepartment: boolean;
  departmentLabel: string;
  departmentPlaceholder: string;
  waitPerLabel: string;
  open: string;
  closed: string;
  phoneOn: string;
  phoneOff: string;
  guestLink: string;
  notesPlaceholder: string;
  generate: string;
  remote: string;
  walkIn: string;
  ordered: string;
  arrived: string;
  onTheWay: string;
};

type QueueLike = {
  name?: string | null;
  doctorName?: string | null;
  department?: string | null;
  serviceName?: string | null;
};

const shared = {
  graceSetting: 'Minutes they have to arrive after you call them',
  graceHint: 'After this, you can skip them and call the next person.',
  recall: 'Call again',
  remote: 'Joined online',
  walkIn: 'Walk-in',
  ordered: 'Ordered ahead',
  arrived: 'Here',
  onTheWay: 'On the way',
  nameLabel: 'Name',
};

export function queueLanguage(type?: string | null): QueueCopy {
  if (isFoodBusiness(type)) {
    return {
      ...shared,
      pageTitle: 'Waiting list',
      pageHint: 'Call the next party, then seat them at a table.',
      steps: ['Call the next party', 'They come to the host stand', 'Seat them at a table'],
      addButton: 'Add a party',
      addTitle: 'Add a party',
      addHint: 'For guests at the door who do not have a number yet.',
      namePlaceholder: 'e.g. Mehta family',
      peopleNoun: 'parties',
      waitingStat: 'Waiting now',
      waitingHint: 'parties in line',
      doneStat: 'Served today',
      doneHint: 'bills closed',
      waitSetting: 'Minutes a table usually takes',
      waitHint: 'This estimates the wait shown to the next party.',
      readyLabel: 'No one is called yet',
      nowLabel: 'Called to the host stand',
      nextPrefix: 'Next party',
      emptyNow: 'No parties are waiting',
      readyDetail: 'Call the party that has been waiting the longest.',
      callNext: (tokenNumber) => `Call party #${tokenNumber}`,
      finish: 'Serve and close bill',
      listTitle: 'Who is waiting',
      listHint: 'Only the party at the front of the line can be called.',
      emptyTitle: 'No one is waiting',
      emptyBody: 'Parties appear here when they scan the entrance QR, or when you add them.',
      skippedEmpty: 'No skipped parties',
      skippedHint: 'Skipped or cancelled parties can be put back in line from here.',
      assignLabel: 'Which list',
      addLine: 'Add another list',
      addLineTitle: 'Add a waiting list',
      addLineHint: 'Use a separate list for takeaway, a private dining room, or a second seating.',
      lineName: 'List name',
      lineNamePlaceholder: 'e.g. Dinner or Takeaway',
      showStaff: false,
      staffLabel: '',
      staffPlaceholder: '',
      showDepartment: false,
      departmentLabel: '',
      departmentPlaceholder: '',
      waitPerLabel: 'Minutes this list usually takes per party',
      open: 'Accepting parties',
      closed: 'Not taking parties',
      phoneOn: 'Guests can join by phone',
      phoneOff: 'Phone join is off',
      guestLink: 'Link for guests',
      notesPlaceholder: 'e.g. High chair, or a window seat',
      generate: 'Give them a number',
    };
  }

  if (type === 'CLINIC' || type === 'HOSPITAL') {
    return {
      ...shared,
      pageTitle: 'Patient line',
      pageHint: 'Call the next patient, then mark the visit done.',
      steps: ['Call the next patient', 'They come in', 'Mark the visit done'],
      addButton: 'Add a patient',
      addTitle: 'Add a patient',
      addHint: 'For someone at the desk who does not have a number yet.',
      namePlaceholder: 'e.g. Anita Sharma',
      peopleNoun: 'patients',
      waitingStat: 'Waiting now',
      waitingHint: 'patients in line',
      doneStat: 'Seen today',
      doneHint: 'visits finished',
      waitSetting: 'Minutes a visit usually takes',
      waitHint: 'This estimates the wait shown to the next patient.',
      readyLabel: 'Ready for the next patient',
      nowLabel: 'Called in',
      nextPrefix: 'Next patient',
      emptyNow: 'No patients are waiting',
      readyDetail: 'Call the patient who has been waiting the longest.',
      callNext: (tokenNumber) => `Call patient #${tokenNumber}`,
      finish: 'Visit done',
      listTitle: 'Who is waiting',
      listHint: 'Only the patient at the front of the line can be called.',
      emptyTitle: 'No one is waiting',
      emptyBody: 'Patients appear here when they join from the entrance QR, or when you add them.',
      skippedEmpty: 'No skipped patients',
      skippedHint: 'Skipped or cancelled visits can be put back in line from here.',
      assignLabel: 'Which doctor',
      addLine: 'Add a doctor',
      addLineTitle: 'Add a doctor line',
      addLineHint: 'Each doctor has a separate line. Patients choose one when they join.',
      lineName: 'Line name',
      lineNamePlaceholder: 'e.g. Morning clinic',
      showStaff: true,
      staffLabel: 'Doctor',
      staffPlaceholder: 'e.g. Dr. Rao',
      showDepartment: true,
      departmentLabel: 'Department',
      departmentPlaceholder: 'e.g. General medicine',
      waitPerLabel: 'Minutes a visit usually takes',
      open: 'Accepting patients',
      closed: 'Not taking patients',
      phoneOn: 'Patients can join by phone',
      phoneOff: 'Phone join is off',
      guestLink: 'Link for patients',
      notesPlaceholder: 'e.g. Follow-up visit',
      generate: 'Give them a number',
    };
  }

  if (type === 'SALON') {
    return {
      ...shared,
      pageTitle: 'Walk-in line',
      pageHint: 'Call the next guest, then mark the visit done.',
      steps: ['Call the next guest', 'They come to the chair', 'Mark the visit done'],
      addButton: 'Add a guest',
      addTitle: 'Add a guest',
      addHint: 'For a walk-in who does not have a number yet.',
      namePlaceholder: 'e.g. Anita Sharma',
      peopleNoun: 'guests',
      waitingStat: 'Waiting now',
      waitingHint: 'guests in line',
      doneStat: 'Finished today',
      doneHint: 'visits done',
      waitSetting: 'Minutes a visit usually takes',
      waitHint: 'This estimates the wait shown to the next guest.',
      readyLabel: 'Ready for the next guest',
      nowLabel: 'Called to the chair',
      nextPrefix: 'Next guest',
      emptyNow: 'No guests are waiting',
      readyDetail: 'Call the guest who has been waiting the longest.',
      callNext: (tokenNumber) => `Call guest #${tokenNumber}`,
      finish: 'Visit done',
      listTitle: 'Who is waiting',
      listHint: 'Only the guest at the front of the line can be called.',
      emptyTitle: 'No one is waiting',
      emptyBody: 'Guests appear here when they join from the entrance QR, or when you add them.',
      skippedEmpty: 'No skipped guests',
      skippedHint: 'Skipped or cancelled visits can be put back in line from here.',
      assignLabel: 'Which stylist',
      addLine: 'Add a stylist',
      addLineTitle: 'Add a stylist line',
      addLineHint: 'Each stylist has a separate line. Guests choose one when they join.',
      lineName: 'Line name',
      lineNamePlaceholder: 'e.g. Hair or Skin',
      showStaff: true,
      staffLabel: 'Stylist',
      staffPlaceholder: 'e.g. Anita',
      showDepartment: true,
      departmentLabel: 'Service',
      departmentPlaceholder: 'e.g. Haircut',
      waitPerLabel: 'Minutes a visit usually takes',
      open: 'Accepting guests',
      closed: 'Not taking guests',
      phoneOn: 'Guests can join by phone',
      phoneOff: 'Phone join is off',
      guestLink: 'Link for guests',
      notesPlaceholder: 'e.g. Haircut and colour',
      generate: 'Give them a number',
    };
  }

  if (type === 'DIAGNOSTIC_CENTRE') {
    return serviceCopy({
      pageTitle: 'Collection line',
      pageHint: 'Call the next visitor, then mark the visit done.',
      steps: ['Call the next visitor', 'They come to the desk', 'Mark the visit done'],
      peopleNoun: 'visitors',
      addButton: 'Add a visitor',
      addTitle: 'Add a visitor',
      nextPrefix: 'Next visitor',
      readyLabel: 'Ready for the next visitor',
      nowLabel: 'Called to the desk',
      finish: 'Visit done',
      assignLabel: 'Which desk',
      addLine: 'Add a desk',
      addLineTitle: 'Add a collection desk',
      addLineHint: 'Use a separate line for blood collection, imaging, or reports.',
      lineNamePlaceholder: 'e.g. Blood collection',
      departmentLabel: 'Desk',
      departmentPlaceholder: 'e.g. Sample collection',
      open: 'Accepting visitors',
      closed: 'Not taking visitors',
      guestLink: 'Link for visitors',
    });
  }

  if (type === 'SERVICE_CENTRE') {
    return serviceCopy({
      pageTitle: 'Service line',
      pageHint: 'Call the next customer, then mark the visit done.',
      steps: ['Call the next customer', 'They come to the desk', 'Mark the visit done'],
      addLine: 'Add a desk',
      addLineTitle: 'Add a service desk',
      addLineHint: 'Use a separate line for inspection, claims, or pickup.',
      lineNamePlaceholder: 'e.g. Pickup',
      departmentLabel: 'Desk',
      departmentPlaceholder: 'e.g. Inspection',
      assignLabel: 'Which desk',
    });
  }

  return serviceCopy({
    pageTitle: 'Waiting line',
    pageHint: 'Call the next person, then mark the visit done.',
    steps: ['Call the next person', 'They come to the desk', 'Mark the visit done'],
    addLine: 'Add a line',
    addLineTitle: 'Add a line',
    addLineHint: 'Use a separate line when two desks serve people at the same time.',
    lineNamePlaceholder: 'e.g. Returns',
    departmentLabel: 'Desk',
    departmentPlaceholder: 'e.g. Customer desk',
    assignLabel: 'Which line',
  });
}

function serviceCopy(overrides: Partial<QueueCopy> & Pick<QueueCopy, 'pageTitle' | 'pageHint' | 'steps'>): QueueCopy {
  return {
    ...shared,
    addButton: 'Add a customer',
    addTitle: 'Add a customer',
    addHint: 'For someone at the desk who does not have a number yet.',
    namePlaceholder: 'e.g. Anita Sharma',
    peopleNoun: 'people',
    waitingStat: 'Waiting now',
    waitingHint: 'people in line',
    doneStat: 'Finished today',
    doneHint: 'visits done',
    waitSetting: 'Minutes a visit usually takes',
    waitHint: 'This estimates the wait shown to the next person.',
    readyLabel: 'Ready for the next person',
    nowLabel: 'Called to the desk',
    nextPrefix: 'Next person',
    emptyNow: 'No one is waiting',
    readyDetail: 'Call the person who has been waiting the longest.',
    callNext: (tokenNumber) => `Call #${tokenNumber}`,
    finish: 'Visit done',
    listTitle: 'Who is waiting',
    listHint: 'Only the person at the front of the line can be called.',
    emptyTitle: 'No one is waiting',
    emptyBody: 'People appear here when they join from the entrance QR, or when you add them.',
    skippedEmpty: 'No skipped visits',
    skippedHint: 'Skipped or cancelled visits can be put back in line from here.',
    assignLabel: 'Which line',
    addLine: 'Add a line',
    addLineTitle: 'Add a line',
    addLineHint: 'Use a separate line when two desks serve people at the same time.',
    lineName: 'Line name',
    lineNamePlaceholder: 'e.g. Front desk',
    showStaff: false,
    staffLabel: '',
    staffPlaceholder: '',
    showDepartment: true,
    departmentLabel: 'Desk',
    departmentPlaceholder: 'e.g. Front desk',
    waitPerLabel: 'Minutes a visit usually takes',
    open: 'Accepting people',
    closed: 'Not taking people',
    phoneOn: 'People can join by phone',
    phoneOff: 'Phone join is off',
    guestLink: 'Link for customers',
    notesPlaceholder: 'e.g. Returning a previous visit',
    generate: 'Give them a number',
    ...overrides,
  };
}

export function queueDisplayName(queue: QueueLike, type?: string | null) {
  if (isFoodBusiness(type)) return queue.name || 'Waiting list';
  if ((isClinicalBusiness(type) || type === 'SALON') && queue.doctorName) {
    return queue.doctorName;
  }
  return queue.name || queue.serviceName || 'Line';
}

export function queueDisplayDetail(queue: QueueLike, type?: string | null) {
  if (isFoodBusiness(type)) return '';
  if ((isClinicalBusiness(type) || type === 'SALON') && queue.doctorName && queue.name && queue.name !== queue.doctorName) {
    return queue.name;
  }
  return queue.department || '';
}
