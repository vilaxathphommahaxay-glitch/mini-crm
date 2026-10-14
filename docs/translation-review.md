# Translation review sheet

A snapshot of every piece of text in the interface, English next to Lao (2026-10-14).
The Lao was written by an AI assistant and **has not yet been checked by a native speaker**.

## How to give feedback

Reading this page is enough: note the **key** (first column) and the wording you would use instead.
Developers then change that line in `frontend/src/i18n/lo.ts` (the file that is the source of truth;
this page can go out of date). `{name}`, `{count}` and similar in curly braces are filled in by the
program — keep them as they are.

## Words the whole interface is built from

Please check these first; a change here should be applied everywhere.

| English | Lao | Note |
|---|---|---|
| Contact | ລູກຄ້າ | A person you sell to or might sell to. Plain word chosen over a loan-word. |
| Company | ບໍລິສັດ | A customer's company or shop. |
| Deal | ລາຍການຂາຍ | One sale being worked on (not the abstract word “sales”). |
| Pipeline | ຂັ້ນຕອນການຂາຍ | The stages a sale goes through. |
| Lead | ລູກຄ້າທີ່ສົນໃຈ | Stage 1: someone interested, not yet qualified. |
| Qualified | ມີທ່າແຮງຊື້ | Stage 2: likely to buy. |
| Proposal | ສະເໜີລາຄາ | Stage 3: a price or offer has been sent. |
| Negotiation | ເຈລະຈາ | Stage 4. |
| Won / Lost | ຂາຍໄດ້ / ຂາຍບໍ່ໄດ້ | Described by meaning (“sold” / “not sold”) rather than borrowed words. |
| Task | ວຽກທີ່ຕ້ອງເຮັດ | A to-do with a due date. |
| Activity | ກິດຈະກຳ | A logged call, meeting, note or task. |
| Owner | ຜູ້ຮັບຜິດຊອບ | The salesperson responsible for a record. |
| Tag | ປ້າຍກຳກັບ | A label such as “wholesale”. |
| Admin / Staff | ຜູ້ດູແລລະບົບ / ພະນັກງານ | The two roles. |
| LAK / THB / USD | ກີບ / ບາດ / ໂດລາ | Currencies are named in Lao instead of showing codes. |
| Transfer records | ໂອນຂໍ້ມູນ | Hand a person's customers, deals and tasks to someone else. |
| Quote / Quotation | ໃບສະເໜີລາຄາ | A priced offer for a deal, printed or sent to the customer. |
| VAT | ອາກອນມູນຄ່າເພີ່ມ | Value-added tax, as a percentage. |

## Everything on screen

| Key | English | Lao |
|---|---|---|
| `lang.label` | Language | ພາສາ |
| `nav.main` | Main | ເມນູຫຼັກ |
| `nav.openMenu` | Open menu | ເປີດເມນູ |
| `nav.search` | Search… | ຄົ້ນຫາ… |
| `nav.dashboard` | Dashboard | ພາບລວມ |
| `nav.contacts` | Contacts | ລູກຄ້າ |
| `nav.companies` | Companies | ບໍລິສັດ |
| `nav.pipeline` | Pipeline | ຂັ້ນຕອນການຂາຍ |
| `nav.tasks` | Tasks | ວຽກທີ່ຕ້ອງເຮັດ |
| `nav.users` | Users | ຜູ້ໃຊ້ລະບົບ |
| `nav.settings` | Settings | ຕັ້ງຄ່າ |
| `nav.logout` | Log out | ອອກຈາກລະບົບ |
| `reminders.label` | {count} tasks overdue or due today | ມີ {count} ວຽກທີ່ເກີນກຳນົດ ຫຼື ຄົບກຳນົດມື້ນີ້ |
| `reminders.label_one` | {count} task overdue or due today | ມີ {count} ວຽກທີ່ເກີນກຳນົດ ຫຼື ຄົບກຳນົດມື້ນີ້ |
| `role.admin` | Admin | ຜູ້ດູແລລະບົບ |
| `role.staff` | Staff | ພະນັກງານ |
| `common.save` | Save | ບັນທຶກ |
| `common.cancel` | Cancel | ຍົກເລີກ |
| `common.delete` | Delete | ລຶບ |
| `common.edit` | Edit | ແກ້ໄຂ |
| `common.call` | Call | ໂທ |
| `common.whatsapp` | WhatsApp | ແຊັດ WhatsApp |
| `common.close` | Close | ປິດ |
| `common.dismiss` | Dismiss | ປິດ |
| `common.done` | Done | ສຳເລັດ |
| `common.search` | Search | ຄົ້ນຫາ |
| `common.loading` | Loading… | ກຳລັງໂຫຼດ… |
| `common.tryAgain` | Try again | ລອງໃໝ່ |
| `common.previous` | Previous | ກ່ອນໜ້າ |
| `common.next` | Next | ຕໍ່ໄປ |
| `common.range` | {from}–{to} of {total} | {from}–{to} ຈາກທັງໝົດ {total} |
| `common.loadingSession` | Loading your session… | ກຳລັງເປີດບັນຊີຂອງທ່ານ… |
| `currency.LAK` | LAK | ກີບ |
| `currency.THB` | THB | ບາດ |
| `currency.USD` | USD | ໂດລາ |
| `stage.lead` | Lead | ລູກຄ້າທີ່ສົນໃຈ |
| `stage.qualified` | Qualified | ມີທ່າແຮງຊື້ |
| `stage.proposal` | Proposal | ສະເໜີລາຄາ |
| `stage.negotiation` | Negotiation | ເຈລະຈາ |
| `stage.won` | Won | ຂາຍໄດ້ |
| `stage.lost` | Lost | ຂາຍບໍ່ໄດ້ |
| `activity.call` | Call | ໂທລະສັບ |
| `activity.meeting` | Meeting | ນັດພົບ |
| `activity.note` | Note | ບັນທຶກ |
| `activity.task` | Task | ວຽກທີ່ຕ້ອງເຮັດ |
| `deals.deal` | Deal | ລາຍການຂາຍ |
| `deals.stage` | Stage | ຂັ້ນຕອນ |
| `deals.value` | Value | ມູນຄ່າ |
| `deals.expectedClose` | Expected close | ວັນທີ່ຄາດວ່າຈະຂາຍໄດ້ |
| `common.contact` | Contact | ລູກຄ້າ |
| `team.title` | Team | ທີມງານ |
| `team.person` | Person | ພະນັກງານ |
| `team.openDeals` | Open deals | ລາຍການຂາຍທີ່ເປີດຢູ່ |
| `team.openValue` | Open value | ມູນຄ່າທີ່ເປີດຢູ່ |
| `team.wonThisMonth` | Won this month | ຂາຍໄດ້ເດືອນນີ້ |
| `team.overdueTasks` | Overdue tasks | ວຽກເກີນກຳນົດ |
| `team.disabled` | disabled | ປິດການໃຊ້ງານ |
| `act.due` | Due {date} | ຄົບກຳນົດ {date} |
| `act.overdue` | overdue | ເກີນກຳນົດ |
| `act.today` | today | ມື້ນີ້ |
| `act.markedDone` | Marked as done | ໝາຍວ່າສຳເລັດແລ້ວ |
| `act.markedNotDone` | Marked as not done | ໝາຍວ່າຍັງບໍ່ສຳເລັດ |
| `act.deleted` | Activity deleted | ລຶບກິດຈະກຳແລ້ວ |
| `act.doneAria` | Done: {subject} | ສຳເລັດ: {subject} |
| `act.dealLink` | Deal: {title} | ລາຍການຂາຍ: {title} |
| `act.deleteTitle` | Delete activity? | ລຶບກິດຈະກຳນີ້ບໍ? |
| `act.deleteMessage` | “{subject}” will be removed permanently. | “{subject}” ຈະຖືກລຶບຖາວອນ. |
| `palette.contacts` | Contacts | ລູກຄ້າ |
| `palette.companies` | Companies | ບໍລິສັດ |
| `palette.deals` | Deals | ລາຍການຂາຍ |
| `palette.hint` | Search contacts, companies and deals | ຄົ້ນຫາລູກຄ້າ, ບໍລິສັດ ແລະ ລາຍການຂາຍ |
| `palette.failed` | Search failed. Try again. | ຄົ້ນຫາບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່. |
| `palette.empty` | No results for “{query}” | ບໍ່ພົບຜົນຄົ້ນຫາສຳລັບ “{query}” |
| `palette.results` | Search results | ຜົນຄົ້ນຫາ |
| `palette.placeholder` | Search contacts, companies and deals… | ຄົ້ນຫາລູກຄ້າ, ບໍລິສັດ ແລະ ລາຍການຂາຍ… |
| `palette.keys` | ↑ ↓ to move · Enter to open · Esc to close | ↑ ↓ ເລື່ອນ · Enter ເປີດ · Esc ປິດ |
| `month.0` | Jan | ມ.ກ. |
| `month.1` | Feb | ກ.ພ. |
| `month.2` | Mar | ມ.ນ. |
| `month.3` | Apr | ມ.ສ. |
| `month.4` | May | ພ.ພ. |
| `month.5` | Jun | ມິ.ຖ. |
| `month.6` | Jul | ກ.ລ. |
| `month.7` | Aug | ສ.ຫ. |
| `month.8` | Sep | ກ.ຍ. |
| `month.9` | Oct | ຕ.ລ. |
| `month.10` | Nov | ພ.ຈ. |
| `month.11` | Dec | ທ.ວ. |
| `chart.currency` | Currency | ສະກຸນເງິນ |
| `chart.empty` | No won deals in the last 12 months | ບໍ່ມີລາຍການຂາຍທີ່ຂາຍໄດ້ໃນ 12 ເດືອນຜ່ານມາ |
| `chart.caption` | Won revenue by month in {currency} | ຍອດຂາຍທີ່ຂາຍໄດ້ແຕ່ລະເດືອນ ເປັນສະກຸນ {currency} |
| `chart.month` | Month | ເດືອນ |
| `chart.won` | Won | ຂາຍໄດ້ |
| `login.title` | Sign in to Mini CRM | ເຂົ້າສູ່ລະບົບ Mini CRM |
| `login.email` | Email | ອີເມວ |
| `login.password` | Password | ລະຫັດຜ່ານ |
| `login.submit` | Sign in | ເຂົ້າສູ່ລະບົບ |
| `settings.changePassword` | Change password | ປ່ຽນລະຫັດຜ່ານ |
| `settings.current` | Current password | ລະຫັດຜ່ານປັດຈຸບັນ |
| `settings.new` | New password | ລະຫັດຜ່ານໃໝ່ |
| `settings.newHint` | At least {n} characters | ຢ່າງໜ້ອຍ {n} ຕົວອັກສອນ |
| `settings.confirm` | Confirm new password | ຢືນຢັນລະຫັດຜ່ານໃໝ່ |
| `settings.changed` | Password changed | ປ່ຽນລະຫັດຜ່ານແລ້ວ |
| `validation.minChars` | At least {n} characters | ຢ່າງໜ້ອຍ {n} ຕົວອັກສອນ |
| `validation.maxChars` | At most {n} characters | ບໍ່ເກີນ {n} ຕົວອັກສອນ |
| `validation.mismatch` | Passwords do not match | ລະຫັດຜ່ານບໍ່ກົງກັນ |
| `validation.required` | This field is required | ຕ້ອງໃສ່ຂໍ້ມູນນີ້ |
| `validation.tooLong` | This is too long | ຍາວເກີນໄປ |
| `validation.invalid` | This is not valid | ຂໍ້ມູນບໍ່ຖືກຕ້ອງ |
| `validation.email` | Enter a valid email address | ກະລຸນາໃສ່ອີເມວທີ່ຖືກຕ້ອງ |
| `error.generic` | Something went wrong. Please try again. | ມີບາງຢ່າງຜິດພາດ. ກະລຸນາລອງໃໝ່. |
| `error.network` | Cannot reach the server. Check your connection. | ບໍ່ສາມາດເຊື່ອມຕໍ່ເຊີບເວີໄດ້. ກະລຸນາກວດເບິ່ງອິນເຕີເນັດ. |
| `error.requestFailed` | Request failed ({status}) | ການດຳເນີນການບໍ່ສຳເລັດ ({status}) |
| `error.unauthorized` | Your session has ended. Please sign in again. | ໝົດເວລາການເຂົ້າໃຊ້ແລ້ວ. ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່. |
| `error.invalidCredentials` | Incorrect email or password | ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ |
| `error.accountDisabled` | This account has been disabled | ບັນຊີນີ້ຖືກປິດການໃຊ້ງານແລ້ວ |
| `error.tooManyAttempts` | Too many failed sign-ins. Try again in {minutes} minutes. | ເຂົ້າສູ່ລະບົບຜິດຫຼາຍເທື່ອເກີນໄປ. ກະລຸນາລອງໃໝ່ອີກ {minutes} ນາທີ. |
| `error.tooManyAttempts_one` | Too many failed sign-ins. Try again in {minutes} minute. | ເຂົ້າສູ່ລະບົບຜິດຫຼາຍເທື່ອເກີນໄປ. ກະລຸນາລອງໃໝ່ອີກ {minutes} ນາທີ. |
| `error.forbidden` | You don't have permission to do this. | ທ່ານບໍ່ມີສິດເຮັດການນີ້. |
| `error.notFound` | Not found | ບໍ່ພົບຂໍ້ມູນ |
| `error.emailTaken` | A user with this email already exists | ມີຜູ້ໃຊ້ທີ່ໃຊ້ອີເມວນີ້ແລ້ວ |
| `error.selfChange` | You can't disable your own account or remove your own admin role. | ທ່ານບໍ່ສາມາດປິດບັນຊີຂອງຕົນເອງ ຫຼື ລຶບສິດຜູ້ດູແລຂອງຕົນເອງໄດ້. |
| `error.companyInUse` | This company still has {contacts} contacts and {deals} deals. Move or delete them first. | ບໍລິສັດນີ້ຍັງມີລູກຄ້າ {contacts} ຄົນ ແລະ ລາຍການຂາຍ {deals} ລາຍການ. ກະລຸນາຍ້າຍ ຫຼື ລຶບອອກກ່ອນ. |
| `error.contactInUse` | This contact still has {deals} deals. Delete or move them first. | ລູກຄ້ານີ້ຍັງມີລາຍການຂາຍ {deals} ລາຍການ. ກະລຸນາລຶບ ຫຼື ຍ້າຍອອກກ່ອນ. |
| `error.conflict` | This conflicts with existing data | ຂໍ້ມູນນີ້ຂັດກັບຂໍ້ມູນທີ່ມີຢູ່ແລ້ວ |
| `error.fileTooLarge` | The file is larger than 1 MB | ໄຟລ໌ໃຫຍ່ເກີນ 1 MB |
| `error.fileNotUtf8` | The file must be saved as UTF-8 CSV | ຕ້ອງບັນທຶກໄຟລ໌ເປັນ CSV ແບບ UTF-8 |
| `error.fileEmpty` | The file is empty | ໄຟລ໌ບໍ່ມີຂໍ້ມູນ |
| `error.fileMissingColumn` | The file needs a first_name column | ໄຟລ໌ຕ້ອງມີຖັນ first_name (ຊື່) |
| `error.fileTooManyRows` | Too many rows: at most 1,000 contacts per file | ມີແຖວຫຼາຍເກີນໄປ: ນຳເຂົ້າໄດ້ບໍ່ເກີນ 1,000 ລາຍຊື່ຕໍ່ໄຟລ໌ |
| `error.invalidInput` | Some of the information is not valid | ຂໍ້ມູນບາງຢ່າງບໍ່ຖືກຕ້ອງ |
| `fielderror.notFound` | That record no longer exists | ບໍ່ພົບຂໍ້ມູນນີ້ແລ້ວ |
| `fielderror.inactiveUser` | Choose an active user | ກະລຸນາເລືອກຜູ້ໃຊ້ທີ່ຍັງໃຊ້ງານຢູ່ |
| `fielderror.sameUser` | Choose a different user | ກະລຸນາເລືອກຄົນອື່ນ |
| `fielderror.wrongPassword` | Current password is incorrect | ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ |
| `fielderror.companyConflict` | Choose an existing company or type a new name, not both | ກະລຸນາເລືອກບໍລິສັດທີ່ມີຢູ່ ຫຼື ພິມຊື່ໃໝ່ ບໍ່ແມ່ນທັງສອງຢ່າງ |
| `fielderror.badPosition` | The deal could not be placed there | ບໍ່ສາມາດວາງລາຍການຂາຍໃນຕຳແໜ່ງນີ້ໄດ້ |
| `validation.firstNameRequired` | First name is required | ກະລຸນາໃສ່ຊື່ |
| `validation.nameRequired` | Name is required | ກະລຸນາໃສ່ຊື່ |
| `validation.titleRequired` | Title is required | ກະລຸນາໃສ່ຫົວຂໍ້ |
| `validation.subjectRequired` | Subject is required | ກະລຸນາໃສ່ຫົວຂໍ້ |
| `validation.tagsTooLong` | Tags are too long | ປ້າຍກຳກັບຍາວເກີນໄປ |
| `validation.newCompanyName` | Type the new company name | ກະລຸນາພິມຊື່ບໍລິສັດໃໝ່ |
| `validation.valueRequired` | Value is required | ກະລຸນາໃສ່ມູນຄ່າ |
| `validation.valueFormat` | Enter an amount like 1500000 or 99.50 | ກະລຸນາໃສ່ຈຳນວນເງິນ ເຊັ່ນ 1500000 ຫຼື 99.50 |
| `validation.chooseContact` | Choose a contact | ກະລຸນາເລືອກລູກຄ້າ |
| `validation.nextStep` | What needs to happen next? | ຕ້ອງເຮັດຫຍັງຕໍ່ໄປ? |
| `validation.pickDate` | Pick a date | ກະລຸນາເລືອກວັນທີ |
| `f.firstName` | First name | ຊື່ |
| `f.lastName` | Last name | ນາມສະກຸນ |
| `f.email` | Email | ອີເມວ |
| `f.phone` | Phone | ເບີໂທລະສັບ |
| `f.company` | Company | ບໍລິສັດ |
| `f.tags` | Tags | ປ້າຍກຳກັບ |
| `f.owner` | Owner | ຜູ້ຮັບຜິດຊອບ |
| `f.notes` | Notes | ໝາຍເຫດ |
| `f.name` | Name | ຊື່ |
| `f.website` | Website | ເວັບໄຊ |
| `f.address` | Address | ທີ່ຢູ່ |
| `f.title` | Title | ຫົວຂໍ້ |
| `f.value` | Value | ມູນຄ່າ |
| `f.currency` | Currency | ສະກຸນເງິນ |
| `f.stage` | Stage | ຂັ້ນຕອນ |
| `f.expectedClose` | Expected close | ວັນທີ່ຄາດວ່າຈະຂາຍໄດ້ |
| `f.contact` | Contact | ລູກຄ້າ |
| `f.type` | Type | ປະເພດ |
| `f.subject` | Subject | ຫົວຂໍ້ |
| `f.details` | Details | ລາຍລະອຽດ |
| `f.date` | Date | ວັນທີ |
| `f.dueDate` | Due date | ວັນຄົບກຳນົດ |
| `f.done` | Done | ສຳເລັດແລ້ວ |
| `f.deal` | Deal | ລາຍການຂາຍ |
| `f.role` | Role | ສິດການໃຊ້ງານ |
| `f.password` | Password | ລະຫັດຜ່ານ |
| `f.active` | Active (can log in) | ໃຊ້ງານຢູ່ (ເຂົ້າລະບົບໄດ້) |
| `select.noCompany` | — No company — | — ບໍ່ມີບໍລິສັດ — |
| `select.newCompany` | + New company… | + ບໍລິສັດໃໝ່… |
| `select.chooseContact` | — Choose a contact — | — ເລືອກລູກຄ້າ — |
| `select.noDeal` | — No deal — | — ບໍ່ມີລາຍການຂາຍ — |
| `select.me` | — Me — | — ຂ້ອຍເອງ — |
| `select.allOwners` | All owners | ຜູ້ຮັບຜິດຊອບທັງໝົດ |
| `select.disabledOwner` | {name} (disabled) | {name} (ປິດການໃຊ້ງານ) |
| `contactForm.new` | New contact | ເພີ່ມລູກຄ້າ |
| `contactForm.edit` | Edit contact | ແກ້ໄຂລູກຄ້າ |
| `contactForm.created` | Contact created | ເພີ່ມລູກຄ້າແລ້ວ |
| `contactForm.updated` | Contact updated | ບັນທຶກການແກ້ໄຂແລ້ວ |
| `contactForm.duplicate` | Already in your contacts: | ມີໃນລາຍຊື່ລູກຄ້າຂອງທ່ານແລ້ວ: |
| `contactForm.newCompanyName` | New company name | ຊື່ບໍລິສັດໃໝ່ |
| `contactForm.newCompanyHint` | If a company with this name already exists, the contact is added to it | ຖ້າມີບໍລິສັດຊື່ນີ້ຢູ່ແລ້ວ ລູກຄ້າຈະຖືກເພີ່ມເຂົ້າບໍລິສັດນັ້ນ |
| `contactForm.tagsHint` | Separate with commas, e.g. vip, wholesale | ແຍກດ້ວຍເຄື່ອງໝາຍຈຸດ , ເຊັ່ນ ລູກຄ້າສຳຄັນ, ຂາຍສົ່ງ |
| `companyForm.new` | New company | ເພີ່ມບໍລິສັດ |
| `companyForm.edit` | Edit company | ແກ້ໄຂບໍລິສັດ |
| `companyForm.created` | Company created | ເພີ່ມບໍລິສັດແລ້ວ |
| `companyForm.updated` | Company updated | ບັນທຶກການແກ້ໄຂແລ້ວ |
| `dealForm.new` | New deal | ເພີ່ມລາຍການຂາຍ |
| `dealForm.edit` | Edit deal | ແກ້ໄຂລາຍການຂາຍ |
| `dealForm.created` | Deal created | ເພີ່ມລາຍການຂາຍແລ້ວ |
| `dealForm.updated` | Deal updated | ບັນທຶກການແກ້ໄຂແລ້ວ |
| `dealForm.deleted` | Deal deleted | ລຶບລາຍການຂາຍແລ້ວ |
| `dealForm.stageHint` | change it on the Pipeline board | ປ່ຽນໄດ້ໃນໜ້າຂັ້ນຕອນການຂາຍ |
| `dealForm.companyHint` | Leave empty to use the contact's company | ຖ້າປະວ່າງໄວ້ ຈະໃຊ້ບໍລິສັດຂອງລູກຄ້າ |
| `dealForm.delete` | Delete deal | ລຶບລາຍການຂາຍ |
| `dealForm.deleteTitle` | Delete deal? | ລຶບລາຍການຂາຍນີ້ບໍ? |
| `dealForm.deleteMessage` | “{title}” will be deleted. Its activities stay on the contact's timeline. | “{title}” ຈະຖືກລຶບ. ກິດຈະກຳທີ່ກ່ຽວຂ້ອງຍັງຢູ່ໃນປະຫວັດຂອງລູກຄ້າ. |
| `activityForm.new` | New activity | ເພີ່ມກິດຈະກຳ |
| `activityForm.edit` | Edit activity | ແກ້ໄຂກິດຈະກຳ |
| `activityForm.updated` | Activity updated | ບັນທຶກການແກ້ໄຂແລ້ວ |
| `activityForm.saved` | Activity saved | ບັນທຶກກິດຈະກຳແລ້ວ |
| `activityForm.savedFollowUp` | Activity saved, follow-up scheduled | ບັນທຶກກິດຈະກຳແລ້ວ ແລະ ນັດຕິດຕາມແລ້ວ |
| `activityForm.followUpDefault` | Follow up | ຕິດຕາມ |
| `activityForm.meetingHint` | Set it for an upcoming meeting | ໃສ່ວັນທີ ຖ້າເປັນການນັດພົບໃນອະນາຄົດ |
| `activityForm.followUp` | Schedule a follow-up task | ນັດວຽກຕິດຕາມ |
| `activityForm.nextStep` | Next step | ຂັ້ນຕອນຕໍ່ໄປ |
| `activityForm.due` | Due | ກຳນົດ |
| `userForm.new` | New user | ເພີ່ມຜູ້ໃຊ້ |
| `userForm.edit` | Edit user | ແກ້ໄຂຜູ້ໃຊ້ |
| `userForm.created` | User created | ເພີ່ມຜູ້ໃຊ້ແລ້ວ |
| `userForm.updated` | User updated | ບັນທຶກການແກ້ໄຂແລ້ວ |
| `userForm.passwordKeep` | Leave empty to keep the current password | ປະວ່າງໄວ້ ຖ້າບໍ່ຕ້ອງການປ່ຽນລະຫັດຜ່ານ |
| `userForm.roleSelf` | You cannot change your own role | ທ່ານປ່ຽນສິດຂອງຕົນເອງບໍ່ໄດ້ |
| `userForm.disableNote` | Disabling keeps their records. To hand them to someone else, use “Transfer records” on the users list. | ການປິດບັນຊີບໍ່ລຶບຂໍ້ມູນຂອງເຂົາ. ຖ້າຕ້ອງການມອບຂໍ້ມູນໃຫ້ຄົນອື່ນ ໃຫ້ກົດ “ໂອນຂໍ້ມູນ” ໃນລາຍຊື່ຜູ້ໃຊ້. |
| `transfer.action` | Transfer records | ໂອນຂໍ້ມູນ |
| `transfer.title` | Transfer {name}'s records | ໂອນຂໍ້ມູນຂອງ {name} |
| `transfer.intro` | Every contact, company, deal and activity owned by {name} will be given to the person you choose. Use this when someone leaves or changes role. | ລູກຄ້າ, ບໍລິສັດ, ລາຍການຂາຍ ແລະ ກິດຈະກຳທັງໝົດຂອງ {name} ຈະຖືກມອບໃຫ້ຄົນທີ່ທ່ານເລືອກ. ໃຊ້ເມື່ອມີຄົນລາອອກ ຫຼື ປ່ຽນໜ້າທີ່. |
| `transfer.giveTo` | Give everything to | ມອບທັງໝົດໃຫ້ |
| `transfer.choose` | — Choose a user — | — ເລືອກຜູ້ໃຊ້ — |
| `transfer.done` | Moved to {name}: {contacts} contacts, {companies} companies, {deals} deals, {activities} activities | ໂອນໃຫ້ {name} ແລ້ວ: ລູກຄ້າ {contacts}, ບໍລິສັດ {companies}, ລາຍການຂາຍ {deals}, ກິດຈະກຳ {activities} |
| `common.updated` | Updated | ອັບເດດຫຼ້າສຸດ |
| `common.filterOwner` | Filter by owner | ກັ່ນຕອງຕາມຜູ້ຮັບຜິດຊອບ |
| `contacts.count` | {count} contacts | ລູກຄ້າ {count} ຄົນ |
| `contacts.count_one` | {count} contact | ລູກຄ້າ {count} ຄົນ |
| `contacts.searchLabel` | Search contacts | ຄົ້ນຫາລູກຄ້າ |
| `contacts.searchPlaceholder` | Search name, email, phone or company… | ຄົ້ນຫາຊື່, ອີເມວ, ເບີໂທ ຫຼື ບໍລິສັດ… |
| `contacts.filterTag` | Filter by tag | ກັ່ນຕອງຕາມປ້າຍກຳກັບ |
| `contacts.allTags` | All tags | ປ້າຍກຳກັບທັງໝົດ |
| `contacts.noMatch` | No contacts match these filters | ບໍ່ມີລູກຄ້າທີ່ກົງກັບຕົວກັ່ນຕອງ |
| `contacts.none` | No contacts yet | ຍັງບໍ່ມີລູກຄ້າ |
| `contacts.noneHint` | Add your first contact or import a CSV file. | ເພີ່ມລູກຄ້າຄົນທຳອິດ ຫຼື ນຳເຂົ້າຈາກໄຟລ໌ CSV. |
| `companies.count` | {count} companies | ບໍລິສັດ {count} ແຫ່ງ |
| `companies.count_one` | {count} company | ບໍລິສັດ {count} ແຫ່ງ |
| `companies.searchLabel` | Search companies | ຄົ້ນຫາບໍລິສັດ |
| `companies.searchPlaceholder` | Search name or phone… | ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ… |
| `companies.noMatch` | No companies match these filters | ບໍ່ມີບໍລິສັດທີ່ກົງກັບຕົວກັ່ນຕອງ |
| `companies.none` | No companies yet | ຍັງບໍ່ມີບໍລິສັດ |
| `page.notFound` | Page not found | ບໍ່ພົບໜ້ານີ້ |
| `page.notFoundText` | The page you are looking for doesn’t exist. | ໜ້າທີ່ທ່ານຊອກຫາບໍ່ມີຢູ່. |
| `page.backHome` | Back to dashboard | ກັບໄປໜ້າພາບລວມ |
| `common.details` | Details | ລາຍລະອຽດ |
| `deals.title` | Deals | ລາຍການຂາຍ |
| `act.title` | Activity | ກິດຈະກຳ |
| `act.log` | Log activity | ບັນທຶກກິດຈະກຳ |
| `act.none` | No activity yet | ຍັງບໍ່ມີກິດຈະກຳ |
| `act.noneHint` | Log a call, meeting, note or task. | ບັນທຶກການໂທ, ການນັດພົບ, ໝາຍເຫດ ຫຼື ວຽກທີ່ຕ້ອງເຮັດ. |
| `contactDetail.deleted` | Contact deleted | ລຶບລູກຄ້າແລ້ວ |
| `contactDetail.noDeals` | No deals yet | ຍັງບໍ່ມີລາຍການຂາຍ |
| `contactDetail.deleteTitle` | Delete contact? | ລຶບລູກຄ້ານີ້ບໍ? |
| `contactDetail.deleteMessage` | {name} and their activity history will be deleted. Contacts with deals can't be deleted. | {name} ແລະ ປະຫວັດກິດຈະກຳຂອງເຂົາຈະຖືກລຶບ. ລູກຄ້າທີ່ມີລາຍການຂາຍຢູ່ຈະລຶບບໍ່ໄດ້. |
| `companyDetail.deleted` | Company deleted | ລຶບບໍລິສັດແລ້ວ |
| `companyDetail.addContact` | Add contact | ເພີ່ມລູກຄ້າ |
| `companyDetail.noContacts` | No contacts at this company | ບໍລິສັດນີ້ຍັງບໍ່ມີລູກຄ້າ |
| `companyDetail.noDeals` | No deals with this company | ຍັງບໍ່ມີລາຍການຂາຍກັບບໍລິສັດນີ້ |
| `companyDetail.deleteTitle` | Delete company? | ລຶບບໍລິສັດນີ້ບໍ? |
| `companyDetail.deleteMessage` | {name} will be deleted. Companies that still have contacts or deals can't be deleted. | {name} ຈະຖືກລຶບ. ບໍລິສັດທີ່ຍັງມີລູກຄ້າ ຫຼື ລາຍການຂາຍຢູ່ຈະລຶບບໍ່ໄດ້. |
| `dealPage.openBoard` | Open board | ເປີດກະດານການຂາຍ |
| `dealPage.closed` | Closed | ວັນທີ່ປິດ |
| `dealPage.created` | Created | ວັນທີ່ສ້າງ |
| `dealPage.movedTo` | Moved to {stage} | ຍ້າຍໄປ “{stage}” ແລ້ວ |
| `dealPage.noActivity` | No activity on this deal yet | ລາຍການຂາຍນີ້ຍັງບໍ່ມີກິດຈະກຳ |
| `dealPage.noActivityHint` | Log calls, meetings and next steps here. | ບັນທຶກການໂທ, ການນັດພົບ ແລະ ຂັ້ນຕອນຕໍ່ໄປຢູ່ບ່ອນນີ້. |
| `quote.title` | Quotes | ໃບສະເໜີລາຄາ |
| `quote.new` | New quote | ສ້າງໃບສະເໜີລາຄາ |
| `quote.none` | No quotes yet | ຍັງບໍ່ມີໃບສະເໜີລາຄາ |
| `quote.noneHint` | Make a price offer for the customer, then print it or save it as a PDF. | ສ້າງໃບສະເໜີລາຄາໃຫ້ລູກຄ້າ ແລ້ວພິມ ຫຼື ບັນທຶກເປັນ PDF ໄດ້. |
| `quote.docTitle` | Quotation | ໃບສະເໜີລາຄາ |
| `quote.number` | Quote no. | ເລກທີ |
| `quote.issueDate` | Date | ວັນທີ |
| `quote.validUntil` | Valid until | ໃຊ້ໄດ້ຮອດວັນທີ |
| `quote.billTo` | Quoted to | ສະເໜີໃຫ້ |
| `quote.tel` | Tel. | ໂທ |
| `quote.taxId` | Tax ID | ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ |
| `quote.items` | Products and services | ສິນຄ້າ ແລະ ບໍລິການ |
| `quote.item` | Item {n} | ລາຍການທີ {n} |
| `quote.description` | Description | ລາຍລະອຽດ |
| `quote.quantity` | Qty | ຈຳນວນ |
| `quote.unitPrice` | Unit price | ລາຄາຕໍ່ໜ່ວຍ |
| `quote.amount` | Amount | ເປັນເງິນ |
| `quote.addItem` | Add item | ເພີ່ມລາຍການ |
| `quote.removeItem` | Remove item {n} | ລຶບລາຍການທີ {n} |
| `quote.subtotal` | Subtotal | ລວມ |
| `quote.discount` | Discount | ສ່ວນຫຼຸດ |
| `quote.taxRate` | VAT (%) | ອາກອນມູນຄ່າເພີ່ມ (%) |
| `quote.taxRateHint` | Leave 0 if you don't charge VAT | ໃສ່ 0 ຖ້າບໍ່ເກັບອາກອນ |
| `quote.tax` | VAT {rate}% | ອາກອນມູນຄ່າເພີ່ມ {rate}% |
| `quote.total` | Total | ລວມທັງໝົດ |
| `quote.notes` | Notes | ໝາຍເຫດ |
| `quote.notesHint` | Printed on the quote, e.g. delivery time or what is included. | ຈະພິມໃສ່ໃບສະເໜີລາຄາ ເຊັ່ນ: ໄລຍະເວລາສົ່ງ ຫຼື ສິ່ງທີ່ລວມຢູ່ໃນລາຄາ. |
| `quote.terms` | Terms | ເງື່ອນໄຂ |
| `quote.preparedBy` | Prepared by | ຜູ້ສະເໜີ |
| `quote.acceptedBy` | Accepted by the customer | ລູກຄ້າຕົກລົງ |
| `quote.signature` | Signature and date | ລາຍເຊັນ ແລະ ວັນທີ |
| `quote.edit` | Edit quote | ແກ້ໄຂໃບສະເໜີລາຄາ |
| `quote.backToDeal` | Back to the deal | ກັບໄປທີ່ລາຍການຂາຍ |
| `quote.print` | Print / Save as PDF | ພິມ / ບັນທຶກເປັນ PDF |
| `quote.printHint` | To get a PDF file, choose “Save as PDF” as the printer. | ຖ້າຢາກໄດ້ໄຟລ໌ PDF, ໃຫ້ເລືອກ “Save as PDF” (ບັນທຶກເປັນ PDF) ແທນເຄື່ອງພິມ. |
| `quote.sendWhatsapp` | Send on WhatsApp | ສົ່ງທາງ WhatsApp |
| `quote.created` | Quote {number} created | ສ້າງໃບສະເໜີລາຄາ {number} ແລ້ວ |
| `quote.saved` | Quote saved | ບັນທຶກໃບສະເໜີລາຄາແລ້ວ |
| `quote.deleted` | Quote deleted | ລຶບໃບສະເໜີລາຄາແລ້ວ |
| `quote.delete` | Delete quote | ລຶບໃບສະເໜີລາຄາ |
| `quote.deleteTitle` | Delete this quote? | ລຶບໃບສະເໜີລາຄານີ້ບໍ? |
| `quote.deleteMessage` | Quote {number} will be deleted. This cannot be undone. | ໃບສະເໜີລາຄາ {number} ຈະຖືກລຶບ ແລະ ກູ້ຄືນບໍ່ໄດ້. |
| `quote.useAsDealValue` | Use total as deal value | ໃຊ້ຍອດລວມເປັນມູນຄ່າລາຍການຂາຍ |
| `quote.dealValueUpdated` | Deal value updated | ອັບເດດມູນຄ່າລາຍການຂາຍແລ້ວ |
| `quote.noBusinessAdmin` | Your business name and address are not on the quote yet. Add them in Settings. | ໃບສະເໜີລາຄາຍັງບໍ່ມີຊື່ ແລະ ທີ່ຢູ່ຂອງຮ້ານ. ໃຫ້ໄປໃສ່ໃນໜ້າຕັ້ງຄ່າ. |
| `quote.noBusinessStaff` | Your business name and address are not on the quote yet. Ask an admin to add them in Settings. | ໃບສະເໜີລາຄາຍັງບໍ່ມີຊື່ ແລະ ທີ່ຢູ່ຂອງຮ້ານ. ໃຫ້ຜູ້ດູແລລະບົບໃສ່ໃນໜ້າຕັ້ງຄ່າ. |
| `quote.goToSettings` | Open Settings | ໄປທີ່ໜ້າຕັ້ງຄ່າ |
| `business.title` | Business details for quotes | ຂໍ້ມູນຮ້ານ ສຳລັບໃບສະເໜີລາຄາ |
| `business.hint` | Printed at the top of every quote. | ຈະພິມຢູ່ເທິງສຸດຂອງທຸກໃບສະເໜີລາຄາ. |
| `business.name` | Business name | ຊື່ຮ້ານ ຫຼື ບໍລິສັດ |
| `business.terms` | Standard terms | ເງື່ອນໄຂມາດຕະຖານ |
| `business.termsHint` | Printed at the bottom of every quote, e.g. how to pay or your bank account. | ຈະພິມຢູ່ລຸ່ມສຸດຂອງທຸກໃບສະເໜີລາຄາ ເຊັ່ນ: ວິທີຈ່າຍເງິນ ຫຼື ເລກບັນຊີທະນາຄານ. |
| `business.saved` | Business details saved | ບັນທຶກຂໍ້ມູນຮ້ານແລ້ວ |
| `nav.history` | Change history | ປະຫວັດການແກ້ໄຂ |
| `history.title` | Edit history | ປະຫວັດການແກ້ໄຂ |
| `history.subtitle` | Every change anyone made, newest first. | ທຸກການແກ້ໄຂຂອງທຸກຄົນ, ລ່າສຸດຢູ່ເທິງ. |
| `history.show` | Show history | ເບິ່ງປະຫວັດການແກ້ໄຂ |
| `history.hide` | Hide history | ເຊື່ອງປະຫວັດການແກ້ໄຂ |
| `history.empty` | No changes recorded yet | ຍັງບໍ່ມີການແກ້ໄຂ |
| `history.emptyHint` | From now on, every change is recorded here. | ຕໍ່ຈາກນີ້ໄປ ທຸກການແກ້ໄຂຈະຖືກບັນທຶກໄວ້ທີ່ນີ້. |
| `history.created` | {actor} added {what} | {actor} ເພີ່ມ{what} |
| `history.updated` | {actor} changed {what} | {actor} ແກ້ໄຂ{what} |
| `history.deleted` | {actor} deleted {what} | {actor} ລຶບ{what} |
| `history.transferred` | {actor} handed everything of {what} to {to} | {actor} ໂອນຂໍ້ມູນທັງໝົດຂອງ {what} ໃຫ້ {to} |
| `history.someone` | Someone | ບາງຄົນ |
| `history.entity.company` | company | ບໍລິສັດ |
| `history.entity.contact` | contact | ລູກຄ້າ |
| `history.entity.deal` | deal | ລາຍການຂາຍ |
| `history.entity.activity` | activity | ກິດຈະກຳ |
| `history.entity.quote` | quote | ໃບສະເໜີລາຄາ |
| `history.entity.user` | user | ຜູ້ໃຊ້ |
| `history.allTypes` | All records | ທຸກປະເພດ |
| `history.filterType` | Show changes to | ສະແດງການແກ້ໄຂຂອງ |
| `history.deals` | Deals | ລາຍການຂາຍ |
| `history.activities` | Activities | ກິດຈະກຳ |
| `history.tagsAdded` | added {tags} | ເພີ່ມ {tags} |
| `history.tagsRemoved` | removed {tags} | ເອົາອອກ {tags} |
| `history.itemsChanged` | Products and services were changed | ມີການແກ້ໄຂລາຍການສິນຄ້າ ແລະ ບໍລິການ |
| `history.yes` | Yes | ແມ່ນ |
| `history.no` | No | ບໍ່ |
| `history.counts` | {companies} companies, {contacts} contacts, {deals} deals, {activities} activities | ບໍລິສັດ {companies}, ລູກຄ້າ {contacts}, ລາຍການຂາຍ {deals}, ກິດຈະກຳ {activities} |
| `files.title` | Files and photos | ໄຟລ໌ ແລະ ຮູບພາບ |
| `files.add` | Add file or photo | ເພີ່ມໄຟລ໌ ຫຼື ຮູບ |
| `files.uploading` | Uploading… | ກຳລັງອັບໂຫຼດ… |
| `files.uploaded` | {count} files added | ເພີ່ມ {count} ໄຟລ໌ແລ້ວ |
| `files.uploaded_one` | File added | ເພີ່ມໄຟລ໌ແລ້ວ |
| `files.none` | No files yet | ຍັງບໍ່ມີໄຟລ໌ |
| `files.noneHint` | Keep photos, contracts and receipts here. Up to {mb} MB each. | ເກັບຮູບ, ສັນຍາ ແລະ ໃບບິນໄວ້ບ່ອນນີ້. ສູງສຸດ {mb} MB ຕໍ່ໄຟລ໌. |
| `files.open` | Open {name} | ເປີດ {name} |
| `files.download` | Download | ດາວໂຫຼດ |
| `files.delete` | Delete {name} | ລຶບ {name} |
| `files.deleteTitle` | Delete this file? | ລຶບໄຟລ໌ນີ້ບໍ? |
| `files.deleteMessage` | “{name}” will be deleted permanently. | “{name}” ຈະຖືກລຶບຖາວອນ. |
| `files.deleted` | File deleted | ລຶບໄຟລ໌ແລ້ວ |
| `files.tooLarge` | “{name}” is larger than {mb} MB | “{name}” ໃຫຍ່ເກີນ {mb} MB |
| `error.attachmentTooLarge` | The file is larger than {mb} MB | ໄຟລ໌ໃຫຍ່ເກີນ {mb} MB |
| `error.fileTypeNotAllowed` | This kind of file can't be attached. Use photos, PDF, Word, Excel, PowerPoint, text or ZIP files. | ແນບໄຟລ໌ປະເພດນີ້ບໍ່ໄດ້. ໃຫ້ໃຊ້ຮູບ, PDF, Word, Excel, PowerPoint, ໄຟລ໌ຂໍ້ຄວາມ ຫຼື ZIP. |
| `history.entity.attachment` | file | ໄຟລ໌ |
| `validation.descriptionRequired` | Describe the item | ໃສ່ລາຍລະອຽດຂອງລາຍການ |
| `validation.quantity` | Enter a number above 0 | ໃສ່ຕົວເລກທີ່ຫຼາຍກວ່າ 0 |
| `validation.amount` | Enter an amount like 150000 or 99.50 | ໃສ່ຈຳນວນເງິນ ເຊັ່ນ 150000 ຫຼື 99.50 |
| `validation.percent` | Enter a number from 0 to 100 | ໃສ່ຕົວເລກແຕ່ 0 ຫາ 100 |
| `fielderror.discountTooLarge` | The discount is larger than the subtotal | ສ່ວນຫຼຸດຫຼາຍກວ່າຍອດລວມ |
| `fielderror.beforeIssueDate` | Must be on or after the quote date | ຕ້ອງເປັນວັນທີດຽວກັນ ຫຼື ຫຼັງວັນທີອອກໃບ |
| `tasks.today` | Today | ມື້ນີ້ |
| `tasks.overdue` | Overdue | ເກີນກຳນົດ |
| `tasks.upcoming` | Next 7 days | 7 ມື້ຂ້າງໜ້າ |
| `tasks.emptyToday` | Nothing due today | ບໍ່ມີວຽກຄົບກຳນົດມື້ນີ້ |
| `tasks.emptyOverdue` | Nothing overdue — nice work | ບໍ່ມີວຽກເກີນກຳນົດ — ເກັ່ງຫຼາຍ |
| `tasks.emptyUpcoming` | Nothing coming up this week | ອາທິດນີ້ບໍ່ມີວຽກທີ່ຈະຮອດກຳນົດ |
| `tasks.subtitle` | Open activities with a due date. Tick one to mark it done. | ກິດຈະກຳທີ່ມີວັນກຳນົດ ແລະ ຍັງບໍ່ສຳເລັດ. ຕິກໃສ່ຊ່ອງເພື່ອໝາຍວ່າເຮັດແລ້ວ. |
| `tasks.new` | New task | ເພີ່ມວຽກ |
| `tasks.due` | Due | ກຳນົດ |
| `users.subtitle` | Admins see everything; staff only see records they own. | ຜູ້ດູແລເຫັນທຸກຢ່າງ; ພະນັກງານເຫັນສະເພາະຂໍ້ມູນທີ່ຕົນເອງຮັບຜິດຊອບ. |
| `users.status` | Status | ສະຖານະ |
| `users.created` | Created | ວັນທີ່ສ້າງ |
| `users.actions` | Actions | ການດຳເນີນການ |
| `users.you` | (you) | (ທ່ານ) |
| `users.active` | Active | ໃຊ້ງານຢູ່ |
| `users.disabled` | Disabled | ປິດການໃຊ້ງານ |
| `common.seeAll` | See all | ເບິ່ງທັງໝົດ |
| `dashboard.welcome` | Welcome back, {name} | ຍິນດີຕ້ອນຮັບກັບມາ, {name} |
| `dashboard.dueToday` | Due today | ຄົບກຳນົດມື້ນີ້ |
| `dashboard.upcoming` | Coming up (7 days) | ໃກ້ຮອດກຳນົດ (7 ມື້) |
| `dashboard.wonByMonth` | Won revenue by month | ຍອດຂາຍທີ່ຂາຍໄດ້ແຕ່ລະເດືອນ |
| `dashboard.perStage` | Deals per stage | ລາຍການຂາຍແຕ່ລະຂັ້ນຕອນ |
| `dashboard.noNextStep` | Deals without a next step ({count}) | ລາຍການຂາຍທີ່ຍັງບໍ່ມີຂັ້ນຕອນຕໍ່ໄປ ({count}) |
| `dashboard.showFewer` | Show fewer | ເບິ່ງໜ້ອຍລົງ |
| `dashboard.allPlanned` | Every open deal has a planned next step | ທຸກລາຍການຂາຍທີ່ເປີດຢູ່ມີຂັ້ນຕອນຕໍ່ໄປແລ້ວ |
| `dashboard.lastChange` | last change {date} | ອັບເດດລ່າສຸດ {date} |
| `dashboard.addTask` | Add task | ເພີ່ມວຽກ |
| `dashboard.nothingOverdue` | Nothing overdue | ບໍ່ມີວຽກເກີນກຳນົດ |
| `dashboard.caughtUp` | You're all caught up. | ທ່ານເຮັດວຽກຄົບຖ້ວນແລ້ວ. |
| `pipeline.subtitle` | {count} open deals · won and lost show the last 90 days | ລາຍການຂາຍທີ່ເປີດຢູ່ {count} ລາຍການ · ຂາຍໄດ້ ແລະ ຂາຍບໍ່ໄດ້ ສະແດງ 90 ມື້ຫຼ້າສຸດ |
| `pipeline.subtitle_one` | {count} open deal · won and lost show the last 90 days | ລາຍການຂາຍທີ່ເປີດຢູ່ {count} ລາຍການ · ຂາຍໄດ້ ແລະ ຂາຍບໍ່ໄດ້ ສະແດງ 90 ມື້ຫຼ້າສຸດ |
| `pipeline.column` | {stage} column | ຖັນ {stage} |
| `pipeline.drop` | Drop deals here | ວາງລາຍການຂາຍທີ່ນີ້ |
| `pipeline.cardHint` | Arrow keys move the deal between stages, Enter opens it | ໃຊ້ປຸ່ມລູກສອນເພື່ອຍ້າຍລາຍການຂາຍລະຫວ່າງຂັ້ນຕອນ, ກົດ Enter ເພື່ອເປີດ |
| `pipeline.closedOn` | closed {date} | ປິດເມື່ອ {date} |
| `pipeline.moveFailed` | Could not move the deal: {reason} | ຍ້າຍລາຍການຂາຍບໍ່ສຳເລັດ: {reason} |
| `pipeline.tip` | Tip: drag cards between columns, or focus a card (Tab) and use the arrow keys. | ເຄັດລັບ: ລາກບັດໄປຖັນອື່ນ ຫຼື ກົດ Tab ເພື່ອເລືອກບັດ ແລ້ວໃຊ້ປຸ່ມລູກສອນ. |
| `pipeline.tipLink` | Deals are created from contacts too. | ສ້າງລາຍການຂາຍຈາກໜ້າລູກຄ້າໄດ້ຄືກັນ. |
| `csv.export` | Export CSV | ສົ່ງອອກໄຟລ໌ CSV |
| `csv.import` | Import CSV | ນຳເຂົ້າຈາກໄຟລ໌ CSV |
| `csv.dialogTitle` | Import contacts from CSV | ນຳເຂົ້າລູກຄ້າຈາກໄຟລ໌ CSV |
| `csv.columns` | Columns (keep these English names in the first row): | ຖັນໃນແຖວທຳອິດ (ໃຊ້ຊື່ພາສາອັງກິດເຫຼົ່ານີ້): |
| `csv.required` | {field} (first name) is required, the rest are optional. | ຕ້ອງມີ {field} (ຊື່) ເທົ່ານັ້ນ, ສ່ວນອື່ນບໍ່ບັງຄັບ. |
| `csv.tags` | Separate tags with ; — e.g. {example} | ແຍກປ້າຍກຳກັບດ້ວຍ ; — ເຊັ່ນ {example} |
| `csv.companies` | Companies are matched by name; unknown names become new companies. | ບໍລິສັດຈະຈັບຄູ່ຕາມຊື່; ຊື່ທີ່ບໍ່ມີໃນລະບົບຈະຖືກສ້າງເປັນບໍລິສັດໃໝ່. |
| `csv.limits` | Rows with an email you already have are skipped. Max 1,000 rows / 1 MB, UTF-8. | ແຖວທີ່ມີອີເມວຊ້ຳກັບທີ່ມີຢູ່ແລ້ວຈະຖືກຂ້າມ. ສູງສຸດ 1,000 ແຖວ / 1 MB, ເປັນ UTF-8. |
| `csv.template` | Download a template | ດາວໂຫຼດໄຟລ໌ຕົວຢ່າງ |
| `csv.chooseFile` | Choose CSV file | ເລືອກໄຟລ໌ CSV |
| `csv.fileAria` | CSV file | ໄຟລ໌ CSV |
| `csv.noFile` | No file chosen | ຍັງບໍ່ໄດ້ເລືອກໄຟລ໌ |
| `csv.importButton` | Import | ນຳເຂົ້າ |
| `csv.imported` | Imported | ນຳເຂົ້າແລ້ວ |
| `csv.skipped` | Skipped | ຂ້າມ |
| `csv.newCompanies` | New companies | ບໍລິສັດໃໝ່ |
| `csv.skippedRows` | Rows that were skipped | ແຖວທີ່ຖືກຂ້າມ |
| `csv.row` | Row {n} | ແຖວ {n} |
| `csv.importedToast` | Imported {count} contacts | ນຳເຂົ້າລູກຄ້າ {count} ຄົນແລ້ວ |
| `csv.importedToast_one` | Imported {count} contact | ນຳເຂົ້າລູກຄ້າ {count} ຄົນແລ້ວ |
| `csv.duplicate` | Duplicate email {email} — skipped | ອີເມວ {email} ຊ້ຳ — ຂ້າມແລ້ວ |
| `csv.invalidRequired` | {field} is required | ຕ້ອງໃສ່ {field} |
| `csv.invalidInvalid` | {field} is not valid | {field} ບໍ່ຖືກຕ້ອງ |
| `csv.invalidTooLong` | {field} is too long | {field} ຍາວເກີນໄປ |
