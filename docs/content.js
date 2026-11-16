// Written content for the docs. Props, slots and events are NOT here: they come from
// packages/ui/dist/custom-elements.json, generated from the component source.

// Timeline examples show times relative to when the page is opened.
const isoAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString().replace(/:\d\d\.\d+Z$/, 'Z');

export const components = [
  {
    slug: 'button', tag: 'cm-button', react: 'Button', name: 'Button', group: 'Actions',
    summary: 'Triggers an action or moves the merchant to the next step.',
    lead: 'Buttons make the main action on a screen obvious. Black is the primary action; everything else is secondary.',
    examples: [
      { title: 'Primary and secondary', description: 'The save bar pattern: secondary on the left, primary on the right. One primary button per group.',
        html: `<div class="row">
  <cm-button size="large">Cancel</cm-button>
  <cm-button variant="primary" size="large">Save</cm-button>
</div>` },
      { title: 'Sizes', description: '`large` (46px) for save bars and empty states, `medium` (32px) for card and page actions, `slim` (24px) for dense rows and table cells.',
        html: `<div class="row">
  <cm-button variant="primary" size="large">Large</cm-button>
  <cm-button variant="primary" size="medium">Medium</cm-button>
  <cm-button variant="primary" size="slim">Slim</cm-button>
</div>` },
      { title: 'With icon', description: 'Put an icon in the `icon` slot when it makes the action faster to recognise. Keep the label.',
        html: `<div class="row">
  <cm-button><cm-icon slot="icon" name="plus" size="16"></cm-icon>Add product</cm-button>
  <cm-button><cm-icon slot="icon" name="upload" size="16"></cm-icon>Import</cm-button>
  <cm-button><cm-icon slot="icon" name="external" size="16"></cm-icon>View store</cm-button>
</div>` },
      { title: 'Icon only', description: 'For well-known actions where space is tight: the header bar (notifications, refresh, search) and table rows. `icon-only` makes a square of the size\'s height (46, 32 or 24px; at least 44px on touch screens). `label` is required: it is the name screen readers announce. Set `icon` to an icon name, or put a `cm-icon` in the `icon` slot.',
        html: `<div class="row">
  <cm-button icon-only icon="refresh" label="Refresh"></cm-button>
  <cm-button icon-only icon="search" label="Search"></cm-button>
  <cm-button icon-only icon="edit" label="Edit product" size="slim"></cm-button>
  <cm-button icon-only icon="bell" label="Notifications" size="large"></cm-button>
</div>` },
      { title: 'Count', description: '`count` adds a small counter, e.g. unread notifications. It is hidden at 0 and shows "99+" above 99. Screen readers hear the exact number as part of the name: "Notifications, 3 unread". When the count is not "unread" (tasks due, items waiting), change the wording with `strings` (keys `labelWithCount` for icon-only, `count` for text buttons) or `setStrings()`.',
        html: `<div class="row">
  <cm-button icon-only icon="bell" label="Notifications" count="3" size="large"></cm-button>
  <cm-button icon-only icon="mail" label="Mail" count="120" size="large"></cm-button>
  <cm-button icon="inbox" count="7">Inbox</cm-button>
  <cm-button icon="tasks" count="2" strings='{"count":"{count} due today"}'>Tasks</cm-button>
</div>` },
      { title: 'Tones', description: '`tone="critical"` or `tone="success"` colours a button by the outcome it records, so a row of choices scans quickly. Secondary buttons take the tone in their text, icon and outline; primary buttons are filled in it. Leave `tone` off for everything else: most buttons are black and white. Hover, focus, disabled and loading work as on the other buttons. Since 1.2.',
        html: `<div class="stack">
  <div class="row">
    <cm-button size="slim" icon="phone">Spoke to them</cm-button>
    <cm-button size="slim" icon="repeat">No answer, reschedule</cm-button>
    <cm-button size="slim" tone="critical" icon="x-circle">Not interested</cm-button>
    <cm-button size="slim" tone="success" icon="check-circle">Sale closed</cm-button>
  </div>
  <div class="row">
    <cm-button>Cancel</cm-button>
    <cm-button variant="primary" tone="critical" icon="trash">Delete customer</cm-button>
  </div>
  <div class="row">
    <cm-button variant="primary" tone="success" icon="check">Mark as won</cm-button>
  </div>
</div>` },
      { title: 'A row of outcome choices', description: 'When closing a task asks "what happened?" and there are 3 to 5 answers that each finish the task at once, show them as a row of slim secondary buttons, the most common first, and tone only the answers that are clearly good (`success`) or clearly bad (`critical`); neutral ones such as "Reschedule" stay untoned. Use an [[option group|/components/option-group]] instead when the choice is a setting the merchant picks and then confirms with a separate Save, and an [[action menu|/components/action-menu]] when there are more than 5 answers or they are rarely used. Colour is never the only signal: the label says the outcome ("Not interested", not "No"), an icon may support it, and the row still reads correctly in greyscale.',
        html: `<div class="row" role="group" aria-label="Call outcome">
  <cm-button size="slim">Spoke to them</cm-button>
  <cm-button size="slim">No answer, reschedule</cm-button>
  <cm-button size="slim" tone="critical">Not interested</cm-button>
  <cm-button size="slim" tone="success">Sale closed</cm-button>
</div>` },
      { title: 'Loading', description: 'Shows a spinner and blocks repeat clicks while a request runs. Screen readers hear that the button is busy.',
        html: `<cm-button variant="primary" loading>Saving</cm-button>` },
      { title: 'Disabled', description: 'Use sparingly. If an action is unavailable, say why nearby, or let the merchant press it and explain what is missing.',
        html: `<div class="row">
  <cm-button disabled>Duplicate</cm-button>
  <cm-button variant="primary" disabled>Publish</cm-button>
</div>` },
      { title: 'Link', description: 'With `href` the button renders a real link, so it opens in a new tab, can be bookmarked and is announced as a link.',
        html: `<cm-button href="#/components" >Browse components</cm-button>` },
      { title: 'Inside a form', description: '`type="submit"` and `type="reset"` work with a native form, exactly like `<button>`.',
        html: `<form class="stack" onsubmit="event.preventDefault(); this.querySelector('output').textContent = 'Submitted: ' + new FormData(this).get('code')">
  <cm-text-field name="code" label="Discount code" value="DIWALI25"></cm-text-field>
  <div class="row">
    <cm-button type="reset">Reset</cm-button>
    <cm-button type="submit" variant="primary">Create discount</cm-button>
  </div>
  <output></output>
</form>` },
    ],
    do: ['Write labels as a verb plus a noun: "Save", "Add product", "Send preview".', 'Use one primary button per section or save bar.', 'Put the primary button on the right of a group, secondary on its left, `space-20` apart (`space-10` on mobile).'],
    dont: ['Don\'t use two primary buttons side by side.', 'Don\'t use `tone` for decoration or emphasis, and don\'t let the colour carry meaning the label doesn\'t: "Not interested", not a red "No".', 'Don\'t use a button to navigate when a text link would do inside a sentence.', 'Don\'t write "Click here", "OK" or "Submit": say what happens.'],
    content: ['Title case for button labels, short and specific.', 'Keep the same verb across the flow: if the button says "Archive", the confirmation says "Archive", not "Remove".'],
    a11y: ['Renders a native `<button>` (or `<a>` with `href`) inside the shadow root, so it is focusable and announced correctly.', 'Focus ring: 2px `border-strong` outline with 2px offset.', 'While `loading`, the inner button has `aria-busy="true"` and ignores clicks.', 'An icon-only button must have a name: set `label` (it becomes the button\'s `aria-label`). Buttons made before 1.1 with a labelled `cm-icon` in the `icon` slot still work. Without either, the button warns in the console.', 'Icon-only buttons are at least 44 × 44px on touch screens (`pointer: coarse`), whatever their `size`.', 'Tones meet WCAG AA in light and dark themes: label 4.5:1 or more on the button\'s fill (secondary: text-critical / text-success on bg-surface, and on the soft hover fills; primary: action-primary-text on text-critical / text-success), outline 3:1 or more on bg-surface and bg-page. The pairs are checked on every token build. Colour is not announced, so the label must carry the meaning.', 'The visible count is hidden from screen readers; the exact number is read instead, in the name of an icon-only button ("Notifications, 3 unread") or after the text of a text button ("Inbox 7 unread"). The count is not announced when it changes: if a new notification needs announcing, use a Toast.'],
    related: ['banner', 'card', 'icon'],
  },
  {
    slug: 'text-field', tag: 'cm-text-field', react: 'TextField', name: 'Text field', group: 'Forms',
    summary: 'Lets merchants enter or edit text, numbers, dates and times.',
    lead: 'The base of every form. A label above, the box, and room underneath for help text or an error.',
    examples: [
      { title: 'Default', html: `<cm-text-field label="Store name" placeholder="Anika's Boutique"></cm-text-field>` },
      { title: 'With hint', description: 'A bracketed, lowercase note after the label explains a unit or rule without adding a line.',
        html: `<cm-text-field label="Ordered" hint="points earned per rupee (rs. 1) spent" type="number" value="1"></cm-text-field>` },
      { title: 'Help text', html: `<cm-text-field label="Phone" type="tel" autocomplete="tel" help-text="Phone otp is only for Indian numbers"></cm-text-field>` },
      { title: 'Error', description: 'Say what is wrong and how to fix it. The border turns critical and the message is announced.',
        html: `<cm-text-field label="SKU" value="TS-0042" error="This SKU is already used by another product"></cm-text-field>` },
      { title: 'Multiline', html: `<cm-text-field label="Description" multiline rows="4" help-text="Plain text, up to 500 characters"></cm-text-field>` },
      { title: 'Date and time (browser picker)', description: '`type="datetime-local"` and `type="time"` (since 1.2) use the browser\'s own picker. The value is local time with no time zone: `2026-11-20T16:00` and `16:00`. `min`, `max` and `step` (seconds: `900` is 15 minutes) work as on a native input, and a value outside them is invalid with a message in the page language. The box shows the date and time in the browser\'s language, not the page\'s, so an `en-IN` page may show a 24-hour clock in an English (UK) browser. For a picker that follows the page language and matches the date picker, use [[Date picker|/components/date-picker]] with `time`. For "no past times", set `min` from JavaScript: `field.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)`.',
        html: `<div class="stack">
  <cm-text-field label="Follow up on" type="datetime-local" name="follow_up" min="2026-11-16T09:00" step="900"></cm-text-field>
  <cm-text-field label="Call at" type="time" name="call_at" min="09:00" max="18:00" help-text="Between 9 am and 6 pm"></cm-text-field>
</div>` },
      { title: 'Required', description: 'Marked with a red asterisk. The form will not submit while it is empty.',
        html: `<cm-text-field label="Product title" required></cm-text-field>` },
      { title: 'Read-only', description: 'For values the merchant can see and copy but not change here.',
        html: `<cm-text-field label="Order ID" value="#1042" readonly></cm-text-field>` },
      { title: 'Small', description: 'For filter panels and other dense layouts.',
        html: `<div class="row">
  <cm-text-field size="small" label="Min price" type="number" placeholder="0"></cm-text-field>
  <cm-text-field size="small" label="Max price" type="number" placeholder="5000"></cm-text-field>
</div>` },
    ],
    states: [
      { title: 'Disabled', description: 'Can\'t be changed now, and isn\'t sent with the form. Say nearby why, if it isn\'t obvious.',
        html: `<cm-text-field label="Store address" value="preprod.commmerce.com" disabled help-text="Change your address in Domains"></cm-text-field>` },
    ],
    do: ['Always show a visible label.', 'Use `hint` for units and rules, `help-text` for one sentence of guidance.', 'Space fields `space-30` apart on desktop and `space-22` on mobile.', 'Set `type` and `autocomplete` so phones show the right keyboard and browsers can fill it in.'],
    dont: ['Don\'t use the placeholder as the label: it disappears as soon as the merchant types.', 'Don\'t show an error before the merchant has finished with the field.', 'Don\'t disable a field to show a value: use `readonly`.'],
    content: ['Labels are nouns: "Name", "Subject", "Redeemed".', 'Errors say what to do: "Enter a price above 0", not "Invalid input".', 'Help text is one sentence; no full stop needed.'],
    a11y: ['The label is a real `<label>` tied to the input.', 'Errors and help text are linked with `aria-describedby`; errors use `role="alert"` and set `aria-invalid`.', 'Form-associated: the value is submitted with the form, `required` blocks submission, and `form.reset()` restores the initial value.', 'With `min`, `max` or `step`, a value outside them blocks submission (`validity.rangeUnderflow`, `rangeOverflow`, `stepMismatch`) with a message in the page language that names the limit; a half-typed time or date-and-time is `badInput` ("Enter a complete time.").', '`date`, `time` and `datetime-local` are native inputs: each part (day, month, hour, minute, am/pm) is edited with the number keys and Up/Down, and the browser names the parts for screen readers. How the box and picker look is up to the browser: Chromium\'s picker shows a calendar and time columns, while Safari and Firefox edit the time in the box. Not tested with screen readers yet.', 'Input borders are `border-input` (3.4:1), meeting the 3:1 contrast required for form controls.'],
    related: ['checkbox', 'button'],
  },
  {
    slug: 'checkbox', tag: 'cm-checkbox', react: 'Checkbox', name: 'Checkbox', group: 'Forms',
    summary: 'Turns a setting on or off, or picks several items from a list.',
    lead: 'A 20px box with a label and optional help text, for settings and multi-select lists.',
    examples: [
      { title: 'Default', html: `<cm-checkbox label="Track quantity" checked></cm-checkbox>` },
      { title: 'With description', html: `<cm-checkbox label="Charge tax on this product" description="Uses the GST rate in your tax settings"></cm-checkbox>` },
      { title: 'Group', description: 'Rows are `space-30` apart. Wrap related options in a fieldset with a legend.',
        html: `<fieldset class="stack" style="border:0;margin:0;padding:0;gap:var(--cm-space-20)">
  <legend style="font-size:16px;font-weight:500;margin-bottom:var(--cm-space-10)">Notify customers by</legend>
  <cm-checkbox name="notify" value="email" label="Email" checked></cm-checkbox>
  <cm-checkbox name="notify" value="sms" label="SMS" description="Phone otp is only for Indian numbers"></cm-checkbox>
  <cm-checkbox name="notify" value="whatsapp" label="WhatsApp"></cm-checkbox>
</fieldset>` },
      { title: 'Indeterminate', description: 'For a "select all" box when only some rows are selected.',
        html: `<cm-checkbox label="Select all products" indeterminate></cm-checkbox>` },
      { title: 'Disabled', html: `<cm-checkbox label="Allow cash on delivery" description="Set up a payment provider first" disabled></cm-checkbox>` },
    ],
    do: ['Write labels so that ticked means "yes": "Track quantity", not "Don\'t track quantity".', 'Use a checkbox for settings that save with the form; use a toggle for settings that apply straight away.'],
    dont: ['Don\'t use checkboxes for choices that exclude each other: use radio buttons.', 'Don\'t write long labels: move detail into `description`.'],
    content: ['Sentence case labels, no full stop.', 'Descriptions explain the consequence, in one line.'],
    a11y: ['A native checkbox inside a `<label>`; the whole row is clickable.', 'The description is linked with `aria-describedby`.', 'Space toggles it; focus shows a 2px ring around the box.', 'Form-associated: submits `value` when checked.'],
    related: ['text-field', 'card'],
  },
  {
    slug: 'radio', tag: 'cm-radio-group', react: 'RadioGroup', name: 'Radio button', group: 'Forms',
    parts: [{ tag: 'cm-radio', react: 'Radio' }],
    summary: 'Picks exactly one option from a short list.',
    lead: 'A group of 20px round buttons with labels and optional help text. The group holds the value, the keyboard behaviour and the form submission.',
    examples: [
      { title: 'Default', html: `<cm-radio-group name="inventory" label="Inventory" help-text="Inventory tracking condition">
  <cm-radio value="track" label="Track quantity" checked></cm-radio>
  <cm-radio value="untracked" label="Don't track quantity"></cm-radio>
</cm-radio-group>` },
      { title: 'Horizontal', description: 'For two or three short options, such as a status. Options sit `space-30` apart.',
        html: `<cm-radio-group name="status" label="Status of the product" orientation="horizontal">
  <cm-radio value="active" label="Active"></cm-radio>
  <cm-radio value="inactive" label="Inactive" checked></cm-radio>
</cm-radio-group>` },
      { title: 'With descriptions', html: `<cm-radio-group name="checkout" label="Customer accounts">
  <cm-radio value="optional" label="Accounts are optional" description="Customers can check out as a guest" checked></cm-radio>
  <cm-radio value="required" label="Accounts are required" description="User has to create an account to checkout"></cm-radio>
</cm-radio-group>` },
      { title: 'Required with error', description: 'The form will not submit until an option is chosen.',
        html: `<cm-radio-group name="ship" label="Shipping method" required error="Choose a shipping method">
  <cm-radio value="standard" label="Standard"></cm-radio>
  <cm-radio value="express" label="Express"></cm-radio>
</cm-radio-group>` },
      { title: 'Disabled option', html: `<cm-radio-group name="pay" label="Payment">
  <cm-radio value="prepaid" label="Prepaid" checked></cm-radio>
  <cm-radio value="cod" label="Cash on delivery" description="Set up a payment provider first" disabled></cm-radio>
</cm-radio-group>` },
    ],
    do: ['Use radios when the options exclude each other and the merchant should see them all at once.', 'Pre-select the safest or most common option when there is one.', 'Keep to about five options; use a select for longer lists.'],
    dont: ['Don\'t use a single radio on its own: use a checkbox.', 'Don\'t use radios for settings that apply straight away: use a toggle.', 'Don\'t put `<cm-radio>` outside a `<cm-radio-group>`: the group owns the value.'],
    content: ['The group label asks the question: "Status of the product".', 'Option labels are short and parallel: "Active", "Inactive".', 'Descriptions explain the consequence in one line.'],
    a11y: ['The group is a `radiogroup` named by its label; each option is a `radio` with `aria-checked`.', 'One tab stop: Tab reaches the selected option (or the first one), arrow keys move and select, skipping disabled options and wrapping at the ends, and Space selects.', 'Form-associated: submits the selected `value` under `name`, `required` blocks submission, and `form.reset()` restores the initial choice.', 'Errors use `role="alert"` and are linked with `aria-describedby`.'],
    related: ['checkbox', 'option-group', 'select'],
  },
  {
    slug: 'toggle', tag: 'cm-toggle', react: 'Toggle', name: 'Toggle', group: 'Forms',
    summary: 'Turns a setting on or off straight away.',
    lead: 'A 38×20 switch for settings that take effect immediately, such as showing a product on the store. Lists often show it without a visible label.',
    examples: [
      { title: 'In a list row', description: 'With no visible label, name it with `aria-label`.',
        html: `<div class="row">
  <cm-toggle aria-label="Show Cotton kurta on store" checked></cm-toggle>
  <cm-toggle aria-label="Show Linen shirt on store"></cm-toggle>
</div>` },
      { title: 'With label', html: `<cm-toggle label="Show on store" checked></cm-toggle>` },
      { title: 'With description', html: `<cm-toggle label="Accept orders" description="Turn off to pause checkout for maintenance"></cm-toggle>` },
      { title: 'Disabled', html: `<cm-toggle label="Cash on delivery" description="Set up a payment provider first" disabled></cm-toggle>` },
    ],
    do: ['Use a toggle when the change applies at once, with no Save button.', 'Write the label as the thing that is on: "Show on store".', 'Confirm the change, for example with a toast, when it affects customers.'],
    dont: ['Don\'t use a toggle inside a form that needs saving: use a checkbox.', 'Don\'t change the label when the state changes; the switch shows the state.', 'Don\'t leave it unnamed: set `label` or `aria-label`.'],
    content: ['Labels are short noun or verb phrases in sentence case.', 'Don\'t add "On" or "Off" text next to the switch.'],
    a11y: ['A native checkbox with `role="switch"`, so screen readers say "switch, on/off". Space toggles it.', 'Figma\'s track colours (`toggle-on`, `toggle-off`) are only 1.9:1 and 1.5:1 against white, so the track and thumb get a 1px `border-input` outline (3.4:1) to meet the 3:1 needed for controls. The thumb position also shows the state.', 'Form-associated: submits `value` when on, and `form.reset()` restores the initial state.', 'Respects reduced motion.'],
    related: ['checkbox', 'radio'],
  },
  {
    slug: 'select', tag: 'cm-select', react: 'Select', name: 'Select', group: 'Forms',
    responsive: ["When the window is 640px wide or less, options in the open list are 14px with a 30px minimum height."],
    summary: 'Picks one option from a list that opens below the field.',
    lead: 'A 42px field with a chevron that opens a list of options. The chosen option is shown in black in the list and as the field\'s value.',
    examples: [
      { title: 'Default', description: 'Write options as `<option>` children, as you would for a native select.',
        html: `<cm-select name="customer" label="Customer" placeholder="Select customer">
  <option value="robinson-rao">Robinson Mid Rao - robiroa09102@gmail.com</option>
  <option value="robinson">Robinson - robinson9900@gmail.com</option>
  <option value="manjunath">Manjunath - manju8393@gmail.com</option>
</cm-select>` },
      { title: 'Next to a button', description: 'The Figma pattern: the field fills the row and a large primary button sits on the right.',
        html: `<div class="row" style="align-items:flex-end;flex-wrap:nowrap">
  <cm-select name="customer" label="Customer" placeholder="Select customer" style="flex:1">
    <option value="robinson">Robinson - robinson9900@gmail.com</option>
    <option value="manjunath">Manjunath - manju8393@gmail.com</option>
  </cm-select>
  <cm-button variant="primary" size="large">Add new customer</cm-button>
</div>` },
      { title: 'Preselected', html: `<cm-select name="status" label="Status">
  <option value="active">Active</option>
  <option value="inactive" selected>Inactive</option>
  <option value="draft">Draft</option>
</cm-select>` },
      { title: 'Help text and disabled option', html: `<cm-select name="courier" label="Courier" placeholder="Choose a courier" help-text="Used for new orders only">
  <option value="delhivery">Delhivery</option>
  <option value="bluedart">Blue Dart</option>
  <option value="ekart" disabled>Ekart (not available in your area)</option>
</cm-select>` },
      { title: 'Error', html: `<cm-select name="state" label="State" placeholder="Select state" required error="Choose the state for GST">
  <option value="ka">Karnataka</option>
  <option value="mh">Maharashtra</option>
  <option value="tn">Tamil Nadu</option>
</cm-select>` },
      { title: 'Disabled', html: `<cm-select label="Currency" disabled><option value="inr" selected>Indian rupee (INR)</option></cm-select>` },
    ],
    do: ['Use a select for five or more options, or when space is tight; use radios for fewer.', 'Write a placeholder that says what to pick: "Select customer".', 'Order options in a way the merchant expects: alphabetical, by frequency, or by size.', 'When no option is marked `selected`, `value` is `\'\'`. For a required single choice, either pre-select the sensible default or keep the confirming button (Apply, Save) disabled until `value` is set, so pressing it never silently does nothing.'],
    dont: ['Don\'t use a select for actions: use an action menu.', 'Don\'t use it for yes/no: use a checkbox or toggle.', 'Don\'t put very long lists in it (hundreds of items): use a [[Combobox|/components/combobox]], which filters as the merchant types.'],
    content: ['The label is a noun: "Customer", "Status".', 'Options are short and start with the word that tells them apart, so typeahead works.'],
    a11y: ['**Why a custom list, not a native `<select>`:** Figma\'s open list is a styled panel with a full-width black band on the chosen option, and native select popups can\'t be styled that way (and look different on every OS). So it follows the WAI-ARIA "select-only combobox" pattern, with native-select keyboard support.', 'Keyboard: Down, Up, Enter or Space opens; arrows move (skipping disabled options); Home and End jump; Page Up/Down move by ten; typing letters jumps to a match (repeat a letter to cycle); Enter or Space chooses; Escape closes without choosing; Tab chooses the highlighted option and moves on.', 'The field is a `combobox` labelled by the visible label, with `aria-expanded` and `aria-activedescendant`; options are `option`s with `aria-selected`.', 'Form-associated: submits `value` under `name`, `required` blocks submission, and `form.reset()` restores the initial choice. `<option selected>` sets the initial value.', 'Differs from Figma for contrast: the border is `border-input` (Figma #D6D6D6 is 1.45:1) and the placeholder is `text-tertiary` (Figma #9E9E9E is 2.7:1).'],
    related: ['radio', 'option-group', 'text-field'],
  },
  {
    slug: 'search', tag: 'cm-search', react: 'Search', name: 'Search', group: 'Forms',
    summary: 'Filters a list or table by what the merchant types.',
    lead: 'A grey box with a search icon, placed at the top of lists. It can carry a filter button that opens a filter panel.',
    examples: [
      { title: 'Default', html: `<cm-search label="Search products" placeholder="Search something"></cm-search>` },
      { title: 'With filter', description: 'Listen for `cm-filter` and open your filter panel. `filter-count` shows how many filters are applied.',
        html: `<cm-search label="Search orders" placeholder="Search by order ID or customer" filter filter-count="2"></cm-search>` },
      { title: 'Large', description: '46px, for a search that leads the page.',
        html: `<cm-search size="large" label="Search customers" placeholder="Search something" filter></cm-search>` },
      { title: 'In a table header', description: 'With the 32px small buttons from the same Figma frame next to it.',
        html: `<div class="row" style="flex-wrap:nowrap">
  <cm-search label="Search orders" placeholder="Search something" style="flex:1"></cm-search>
  <cm-button>Bulk orders</cm-button>
</div>` },
    ],
    states: [
      { title: 'No results', description: 'Say what found nothing, and how to widen the search.',
        html: `<div class="stack" style="max-width:520px">
  <cm-search label="Search orders" value="Ramesh"></cm-search>
  <cm-empty-state size="small" icon="search" heading="No orders match “Ramesh”">Check the spelling, or search by order number or phone.</cm-empty-state>
</div>` },
      { title: 'Disabled', description: 'While the list can\'t be searched, for example while it is first loading.',
        html: `<cm-search label="Search orders" placeholder="Search orders" disabled style="max-width:520px"></cm-search>` },
    ],
    do: ['Say what is searched in `label`, and give an example in `placeholder`.', 'Filter as the merchant types for short lists; wait for Enter (`cm-search`) when results come from the server.', 'Show an empty state when nothing matches, with a way to clear the search.'],
    dont: ['Don\'t use the placeholder as the only label: set `label` (it is read out, not shown).', 'Don\'t put more than one search box above a list.'],
    content: ['Placeholders give an example or the fields searched: "Search by order ID or customer".', 'No full stop.'],
    a11y: ['A native `type="search"` input named by `label`. Enter fires `cm-search`; Escape clears.', 'The clear button (shown once there is a query) and the filter button are real buttons with names; the filter count is part of the filter button\'s name.', 'Differs from Figma: the edge is `border-input` (Figma\'s #F1F1F1 border is about 1.1:1, so the box disappears on white) and the placeholder is `text-tertiary` (#9E9E9E on the grey fill is 2.5:1). The clear button is an addition.', 'Form-associated: submits the query under `name`.'],
    related: ['text-field', 'select', 'tag'],
  },
  {
    slug: 'global-search', tag: 'cm-global-search', react: 'GlobalSearch', name: 'Global search', group: 'Navigation',
    responsive: ['Results open under the box at its full width and scroll once they are taller than 480px (or the window less 140px).', 'In the Header bar\'s `search` slot, at 900px or narrower the bar shows a search button instead, and the search opens full screen with the results filling the screen under it.'],
    summary: 'One box that searches everything and lists matches grouped by kind, each a link to its page.',
    lead: 'A search box like [[Search|/components/search]] with a panel of results under it, grouped by kind ("Leads", "Deals", "Tickets"): each group has a heading with its total, up to a few results with a title and a grey second line, and an optional "See all" link. Your app does the searching: listen for `cm-search` (it carries the query), fetch, and set `results`, with `loading` while the request runs. Choosing a result follows its link; `cm-combobox` is the one to use when the merchant picks a value for a form.',
    examples: [
      { title: 'Grouped results', description: 'Type in the box to see results (this demo shows the same results for any query). Arrow keys move through every result across groups, Enter opens one, Escape closes.',
        html: `<div style="min-height:420px;max-width:560px">
  <cm-global-search label="Search the CRM" placeholder="Search leads, deals, tickets" value="ravi"
    results='[{"label": "Leads", "total": 12, "href": "#leads", "items": [{"title": "Ravi Stores", "description": "Lead · Mumbai · +91 98200 12345", "href": "#lead-ravi-stores", "icon": "user"}, {"title": "Ravi Traders", "description": "Lead · Pune", "href": "#lead-ravi-traders", "icon": "user"}]}, {"label": "Deals", "total": 3, "href": "#deals", "items": [{"title": "Ravi Stores annual plan", "description": "Deal · ₹ 48,000 · Negotiation", "href": "#deal-1042", "icon": "wallet"}]}, {"label": "Tickets", "items": [{"title": "Ravi Stores cannot print invoices", "description": "Ticket #5531 · Open", "href": "#ticket-5531", "icon": "help"}]}]'></cm-global-search>
</div>` },
      { title: 'With a shortcut key', description: '`shortcut="/"` lets the merchant press / anywhere on the page to jump to the box (not while typing in a field). It is off by default: turn it on for one search per page, usually the one in the header.',
        html: `<div style="max-width:560px"><cm-global-search label="Search the CRM" placeholder="Search everything" shortcut="/"></cm-global-search></div>` },
      { title: 'In the header bar', description: 'Put it in the Header bar\'s `search` slot. Wider than 900px the box sits inline after the store switcher; this preview is narrower, so the bar shows a search button that opens the search full screen.',
        html: `<cm-header-bar store="preprod.commmerce.com" user-name="Demo user">
  <img slot="logo" src="vendor/brand/mark-black.svg" alt="Commmerce" width="24" height="24">
  <cm-global-search slot="search" label="Search the CRM" placeholder="Search leads, deals, tickets"></cm-global-search>
</cm-header-bar>` },
    ],
    states: [
      { title: 'Loading', description: 'Set `loading` while your request runs: a spinner and "Loading" (announced) replace the results.',
        html: `<div style="min-height:140px;max-width:560px"><cm-global-search label="Search the CRM" value="ravi" loading open></cm-global-search></div>` },
      { title: 'No results', description: 'With a query and no results, the panel says so (`empty-text`). Name what was searched.',
        html: `<div style="min-height:140px;max-width:560px"><cm-global-search label="Search the CRM" value="zzq" open empty-text="No leads, deals or tickets match"></cm-global-search></div>` },
    ],
    do: ['Debounce `cm-search` requests (about 250 ms), cancel stale ones, and set `loading` while they run.', 'Show the best three to five results per kind and link the rest with the group\'s `href` ("See all").', 'Pass each group\'s full `total`, not only the number shown.', 'Make every result a real link (`href`); cancel `cm-select` with `preventDefault()` only to route inside a single-page app.'],
    dont: ['Don\'t use it to pick a value in a form: use a [[Combobox|/components/combobox]].', 'Don\'t use it to filter the list on the current page: use [[Search|/components/search]].', 'Don\'t turn on `shortcut` for more than one search on a page.'],
    content: ['The placeholder names what can be found: "Search leads, deals, tickets".', 'Group headings are the plural kind: "Leads", "Deals". The second line says what the result is and how to tell it apart: "Lead · Mumbai".'],
    a11y: ['Follows the WAI-ARIA combobox pattern with a grouped listbox: the text box has `role="combobox"`, `aria-expanded` and `aria-controls`; results are `option`s inside `group`s named by their heading and total ("Leads, 12 results"). Focus stays in the box and the highlighted result is shown with `aria-activedescendant`.', 'Keyboard: typing searches and opens the results; Down and Up move through every result across groups (wrapping); Enter opens the highlighted result; Escape closes the results, and a second Escape clears the box; Tab moves on and closes them.', 'The number of results, "Loading" and "No results" are announced through a polite live region.', 'The `shortcut` key is opt-in and exposed as `aria-keyshortcuts`; it never fires while the merchant types in a field or holds Ctrl, Alt or Cmd.', 'Why not `cm-search` with a popover: the combobox and its listbox have to share one shadow root for `aria-activedescendant` and `aria-controls` to work, so the box is built in.'],
    related: ['search', 'combobox', 'header-bar'],
  },
  {
    slug: 'combobox', tag: 'cm-combobox', react: 'Combobox', name: 'Combobox', group: 'Forms',
    responsive: ['When the window is 640px wide or less, suggestions in the open list are 14px with a 30px minimum height.', 'Tags wrap onto new lines inside the box, so the box grows taller instead of wider.'],
    summary: 'Suggests matching options as the merchant types; picks one, or several shown as tags.',
    lead: 'A 42px text box that opens a list of matching options as the merchant types. Use it when the list is too long to scroll (customers, products, tags), when results come from the server, or when the merchant may add a value of their own. With `multiple`, chosen options show as removable tags inside the box.',
    examples: [
      { title: 'Default', description: 'Write options as `<option>` children, as for Select. Typing narrows the list to options that contain the text.',
        html: `<cm-combobox name="customer" label="Customer" placeholder="Search customers">
  <option value="c-101">Robinson Mid Rao</option>
  <option value="c-102">Manjunath K</option>
  <option value="c-103">Anika Sharma</option>
  <option value="c-104">Priya Raman</option>
  <option value="c-105">Rahul Verma</option>
</cm-combobox>` },
      { title: 'Product tags (multi-select)', description: '`multiple` shows each chosen tag as a removable [[Tag|/components/tag]]; Backspace in the empty box removes the last one. `allow-custom` offers "Add …" for a tag that doesn\'t exist yet. The form submits each tag as its own `tags` entry.',
        html: `<cm-combobox name="tags" label="Tags" multiple allow-custom placeholder="Find or create tags" help-text="Customers can filter your store by tag">
  <option value="cotton" selected>Cotton</option>
  <option value="summer" selected>Summer</option>
  <option value="handmade">Handmade</option>
  <option value="festive">Festive</option>
  <option value="sale">Sale</option>
  <option value="organic">Organic</option>
</cm-combobox>` },
      { title: 'Results from the server', description: 'With `filter="none"` the component doesn\'t filter. Listen for `cm-search` (its `detail.query` is the text), set `loading` while you fetch, then set `options` and clear `loading`. Debounce the request in your code. In this preview the list is already loaded.',
        html: `<cm-combobox name="product" label="Product" filter="none" placeholder="Search products" empty-text="No products match">
  <option value="p-1">Cotton kurta, indigo</option>
  <option value="p-2">Cotton kurta, white</option>
  <option value="p-3">Silk dupatta</option>
</cm-combobox>` },
      { title: 'Loading', description: 'While `loading`, the open list shows a spinner and "Loading" is announced.',
        html: `<cm-combobox label="Product" filter="none" loading placeholder="Search products"></cm-combobox>` },
      { title: 'Error', html: `<cm-combobox name="courier" label="Courier" required error="Choose a courier for this order" placeholder="Search couriers">
  <option value="delhivery">Delhivery</option>
  <option value="bluedart">Blue Dart</option>
  <option value="ekart" disabled>Ekart (not available in your area)</option>
</cm-combobox>` },
      { title: 'Disabled', html: `<cm-combobox label="Tags" multiple disabled><option value="cotton" selected>Cotton</option></cm-combobox>` },
    ],
    states: [
      { title: 'No results', description: 'Shown in the open list when nothing matches. Set `empty-text` to name what was searched.',
        html: `<cm-combobox label="Customer" empty-text="No customers match" placeholder="Search customers"></cm-combobox>` },
    ],
    do: ['Use a combobox for long lists (more than about 15 options) and for anything loaded from the server; use [[Select|/components/select]] for short fixed lists.', 'Use `multiple` for tags, collections and filters that accept several values.', 'Debounce `cm-search` requests (about 250 ms) and show `loading` while they run.', 'Use `allow-custom` only where a new value makes sense, such as tags; listen for `cm-create` to check or refuse it.'],
    dont: ['Don\'t use it for fewer than about 7 options: a select or radio buttons show every choice at once.', 'Don\'t put actions in the list: use an action menu.', 'Don\'t clear what the merchant typed when results arrive.'],
    content: ['The label is a noun: "Customer", "Tags".', 'The placeholder says what can be searched: "Search by name or phone".', '`empty-text` names what wasn\'t found: "No customers match".'],
    a11y: ['Follows the WAI-ARIA APG "combobox with list autocomplete" pattern: a native text input with `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded` and `aria-controls` pointing at a `listbox`. Focus stays in the text box; the highlighted option is shown with `aria-activedescendant`.', 'Keyboard: typing filters and opens the list; Down and Up open it and move through options (skipping disabled ones, wrapping at the ends); Alt+Down opens it without highlighting; Enter chooses the highlighted option, or adds the typed value with `allow-custom`; Escape closes the list, and a second Escape clears the box; Backspace in an empty box removes the last tag (`multiple`); Tab moves on.', 'The number of matches ("3 results", "No results", "Loading") is announced through a polite live region as the merchant types.', 'With `multiple` the listbox is `aria-multiselectable` and chosen options have `aria-selected="true"` and a check mark, not only colour. Each tag\'s remove button is named "Remove <tag>" and focus returns to the text box after removing.', 'Form-associated: submits `value` under `name`, or with `multiple` one entry per value (`formData.getAll(name)`); `required` blocks submission; `form.reset()` restores the initial choice. `<option selected>` sets it.'],
    related: ['select', 'tag', 'search', 'text-field'],
  },
  {
    slug: 'date-picker', tag: 'cm-date-picker', react: 'DatePicker', name: 'Date picker', group: 'Forms',
    responsive: ['The calendar is never wider than the window less 32px; when the window is 640px wide or less, day cells are 36px tall instead of 40px.', 'With `time`, the date and time boxes sit side by side (date about two thirds) and the time box moves under the date box when the field is narrower than about 300px.'],
    summary: 'Lets merchants type a date or pick one from a calendar, optionally with a time.',
    lead: 'A 42px text box with a calendar button. Merchants can type the date in their own format (15/11/2026, 2026-11-15 or 15 Nov 2026) or open a month calendar to pick it. The value is always ISO `yyyy-mm-dd`, and month and weekday names follow the page language. Add `time` for a date and a time (since 1.2): a time box joins it and the value becomes local `yyyy-mm-ddThh:mm`.',
    examples: [
      { title: 'Default', description: 'Typed dates are read in the order of the page language: day first for `en-IN`, month first for `en-US`. The placeholder shows the order.',
        html: `<cm-date-picker name="ship_by" label="Ship by" locale="en-IN" help-text="The date the courier collects the parcel"></cm-date-picker>` },
      { title: 'With a value, min and max', description: '`min` and `max` take ISO dates. Dates outside them can\'t be picked, and a typed date outside them makes the field invalid.',
        html: `<cm-date-picker name="publish" label="Publish on" value="2026-11-20" min="2026-11-15" max="2026-12-31"></cm-date-picker>` },
      { title: 'Date and time', description: '`time` adds a time box: merchants type `4pm`, `16:00` or `4:15 pm`, or press Up and Down to move by `step` minutes. The time is shown in the locale\'s clock (12-hour with am/pm for `en-IN`). `min="now"` refuses past days and earlier times today, checked again whenever the field is validated. The value is the merchant\'s local date and time with no time zone, e.g. `2026-11-20T16:00`: the browser\'s time zone is the merchant\'s, so convert it with `new Date(value)` before sending it to a server that stores UTC.',
        html: `<cm-date-picker name="follow_up" label="Follow up on" locale="en-IN" time min="now" step="15" required help-text="In your time zone. Times are on the quarter hour."></cm-date-picker>` },
      { title: 'Date and time with limits', description: 'With `time`, `min` and `max` take a date and time (`2026-11-20T10:00`) or a date: a date-only `max` allows the whole of that day. A time outside them, or off the `step`, makes the field invalid with a message that names the limit.',
        html: `<cm-date-picker name="demo_at" label="Demo at" locale="en-IN" time min="2026-11-20T10:00" max="2026-11-27T18:00" step="30" value="2026-11-20T09:30"></cm-date-picker>` },
      { title: 'Unavailable dates', description: '`disabled-dates` lists dates that can\'t be picked (holidays, full slots). For a rule, such as no Sundays, set the `isDateDisabled` property to a function in JavaScript.',
        html: `<cm-date-picker name="pickup" label="Pickup date" value="2026-11-16" disabled-dates="2026-11-17 2026-11-18" help-text="Courier holidays are not available"></cm-date-picker>` },
      { title: 'Another language', description: '`locale` sets the language of month and weekday names and the typed order; without it the picker uses the same language as every other component (`configure({ locale })`, else the nearest `lang` attribute). Translate its built-in text (button names, validation messages, the dd/mm/yyyy letters) with `strings` or `setStrings({ datePicker: {…} })`. `first-day-of-week` sets the first column (0 Sunday, 1 Monday).',
        html: `<cm-date-picker label="तारीख" locale="hi-IN" first-day-of-week="0" value="2026-11-15"></cm-date-picker>` },
      { title: 'Required', html: `<cm-date-picker name="dob" label="Date of birth" required max="2026-11-15"></cm-date-picker>` },
      { title: 'Error', html: `<cm-date-picker name="expiry" label="Offer ends" value="2026-11-01" error="Choose a date after the offer starts (5 Nov 2026)"></cm-date-picker>` },
      { title: 'Small', description: 'For filter panels and other dense layouts.',
        html: `<cm-date-picker size="small" label="Placed after"></cm-date-picker>` },
    ],
    states: [
      { title: 'Disabled', description: 'Can\'t be changed now, and isn\'t sent with the form.',
        html: `<cm-date-picker label="Order date" value="2026-11-15" disabled></cm-date-picker>` },
    ],
    do: ['Let merchants type: it is quicker than the calendar for dates far away, such as a date of birth.', 'Set `min` and `max` when only some dates make sense, and say why in `help-text`.', 'Send and store the ISO `value`; format dates for display with `Intl.DateTimeFormat`.', 'For a start and end date, use [[Date range picker|/components/date-range-picker]].', 'For a follow-up, a booking or a reminder, add `time` and `min="now"`; set `step` (15 or 30) when only round times make sense.'],
    dont: ['Don\'t add `time` when only the day matters (ship-by dates, dates of birth).', 'Don\'t use three separate day, month and year selects.', 'Don\'t hide unavailable dates; they stay in the calendar, crossed out and not choosable.'],
    content: ['The label names the date: "Ship by", "Offer ends", not "Date".', 'Errors say which dates are allowed: "Choose a date after 5 Nov 2026".'],
    a11y: ['Follows the WAI-ARIA APG "date picker dialog" pattern. The text box is a real `<input>` with a `<label>`; the calendar button is named "Choose date for <label>" (or "Change date…, <date>" once set) and has `aria-haspopup="dialog"` and `aria-expanded`.', 'The calendar is a `dialog` with a `grid` labelled by the month heading. The month heading is a polite live region, so changing month is announced. Each day is named with the full date ("Sunday 15 November 2026"); the chosen day has `aria-selected`, today has `aria-current="date"` and unavailable days `aria-disabled`.', 'Keyboard in the calendar: arrows move by day and week (in right-to-left languages the grid runs right to left and Left goes to the next day); Home and End go to the start and end of the week; Page Up/Down change month and Shift+Page Up/Down change year; Enter or Space picks the date and closes; Escape closes without picking. Focus returns to the calendar button either way. Tab moves between the month buttons and the grid and stays inside the calendar while it is open. Alt+Down in the text box opens it.', 'Form-associated: submits the ISO date under `name`; `required` blocks submission while empty; text that is not a date, a date outside `min`/`max` and an unavailable date make the field invalid (`validity.badInput`, `rangeUnderflow`, `rangeOverflow`, `customError`); `form.reset()` restores the initial date.', 'Dates are local calendar dates with no time zone, so a date never shifts by a day for merchants east or west of UTC.', 'With `time`: the time box is a text box named "Time for <label>", sharing the field\'s help text and error. Its placeholder shows the format (hh:mm am). Up and Down move the time by `step` minutes (from an empty box they start at `min` or the current time); Enter or leaving the box reads what was typed. Picking a day in the calendar moves focus to the time box while it is empty. A date without a time, or a time that can\'t be read, makes the field invalid (`validity.badInput`, "Enter a time."); an earlier or later time `rangeUnderflow`/`rangeOverflow`; a time off the step `stepMismatch`. Times are local, like the date: the browser\'s time zone.'],
    related: ['date-range-picker', 'text-field', 'select'],
  },
  {
    slug: 'date-range-picker', tag: 'cm-date-range-picker', react: 'DateRangePicker', name: 'Date range picker', group: 'Forms',
    responsive: ['When the window is 640px wide or less, preset ranges move above the calendar as a row of pills, and day cells are 36px tall.', 'The calendar is never wider than the window less 32px.'],
    summary: 'Picks a start and end date, typed or from a calendar, with preset ranges for reports.',
    lead: 'Two date boxes in one field with a calendar button. In the calendar, the first date picked is the start and the second the end; preset ranges such as "Last 7 days" sit beside it. Use it to filter orders and reports by date.',
    examples: [
      { title: 'Orders date filter', description: 'Presets come from a list of keys: `today`, `yesterday`, `last-7-days`, `last-30-days`, `last-90-days`, `this-month`, `last-month`. Set `max` to the current date when you render the page, so future days can\'t be chosen.',
        html: `<cm-date-range-picker name="placed" label="Order date" presets="today last-7-days last-30-days this-month" start="2026-11-01" end="2026-11-15" help-text="Shows orders placed between these dates"></cm-date-range-picker>` },
      { title: 'In a filter bar', description: 'Next to a search and a status select, in the small size. The form submits `placed-start` and `placed-end`.',
        html: `<div class="row" style="align-items:flex-end">
  <cm-date-range-picker size="small" name="placed" label="Placed" presets="today last-7-days last-30-days this-month" style="flex:1;min-width:260px"></cm-date-range-picker>
  <cm-select label="Payment" style="min-width:160px"><option value="">Any</option><option value="paid">Paid</option><option value="pending">Pending</option></cm-select>
</div>` },
      { title: 'Custom form names', description: 'For a server that expects other field names, set `start-name` and `end-name` (`name` must still be set).',
        html: `<cm-date-range-picker name="range" start-name="from" end-name="to" label="Sale period" min="2026-11-01"></cm-date-range-picker>` },
      { title: 'Required', html: `<cm-date-range-picker name="report" label="Report period" required></cm-date-range-picker>` },
      { title: 'Error', html: `<cm-date-range-picker name="report" label="Report period" start="2026-10-01" end="2026-11-15" error="Choose 31 days or fewer"></cm-date-range-picker>` },
    ],
    states: [
      { title: 'Disabled', description: 'Can\'t be changed now, and isn\'t sent with the form.',
        html: `<cm-date-range-picker label="Report period" start="2026-11-01" end="2026-11-15" disabled></cm-date-range-picker>` },
    ],
    do: ['Offer presets that match what merchants report on; "Last 7 days" and "This month" cover most order and sales filters.', 'Set `max` to today for reports, so empty future days can\'t be chosen.', 'Show the chosen range in the report heading too, so a printed or shared page says which dates it covers.', 'Set custom presets as objects in JavaScript: `picker.presets = [{ label: \'Diwali sale\', start: \'2026-11-01\', end: \'2026-11-08\' }]`.'],
    dont: ['Don\'t use two separate date pickers for a range: the range picker keeps the two dates in order and shows the range.', 'Don\'t offer more than about six presets.', 'Don\'t allow very long ranges your reports can\'t load: check them and set `error`.'],
    content: ['The label names what is filtered: "Order date", "Report period".', 'Preset labels are short and relative: "Last 7 days", "This month".'],
    a11y: ['The field is a `group` named by the label, with two text inputs named "Start date" and "End date" (change with `start-label` and `end-label`). The calendar button is named "Choose dates for <label>", or with the current range once set.', 'The calendar is the same APG date picker grid as [[Date picker|/components/date-picker]], with the same keys. Picking is two steps: a line under the grid says "Choose the start date", then "Start date 4 Nov 2026. Choose the end date." (a polite live region). Dates in the range have `aria-selected`; the start and end days are named "…, start date" and "…, end date".', 'Preset ranges are buttons in a list named "Preset ranges"; the preset that matches the current range has `aria-pressed="true"`. Tab moves between presets, month buttons and the grid, staying inside the open calendar; Escape closes without changing the range and returns focus to the calendar button.', 'Form-associated: submits `<name>-start` and `<name>-end` (or `start-name` / `end-name`) as ISO dates; `required` needs both; an end before the start, text that isn\'t a date and dates outside `min`/`max` make it invalid; `form.reset()` restores the initial range.'],
    related: ['date-picker', 'filter-panel', 'data-table', 'select'],
  },
  {
    slug: 'file-upload', tag: 'cm-file-upload', react: 'FileUpload', name: 'File upload', group: 'Forms',
    responsive: ["Chosen files are shown as tiles: each row holds as many 140–186px tiles as fit.", "When the window is 640px wide or less, the drop zone shown before any file is chosen is at least 100px tall instead of 177px, with 14px text and a smaller label."],
    summary: 'Lets the merchant choose or drop files, such as product images or documents.',
    lead: 'A dashed drop zone under a heading. Chosen images show as thumbnails with a remove button; with `multiple`, a dashed tile at the end adds more.',
    examples: [
      { title: 'Product images', html: `<cm-file-upload name="images" label="Add product images" hint="max. file size 300 KB" accept="image/*" multiple max-size="307200"></cm-file-upload>` },
      { title: 'Single document', description: 'Without `multiple`, a chosen file replaces the zone; remove it to choose another.',
        html: `<cm-file-upload name="gst" label="GST certificate" hint="PDF, up to 2 MB" accept=".pdf" max-size="2097152" prompt="Click here to upload or drop a PDF"></cm-file-upload>` },
      { title: 'Without a heading', description: 'Inside a popup, where the popup title already says what to upload. Give the zone a prompt that names the file.',
        html: `<cm-file-upload name="banner" prompt="Upload banner image" accept="image/*"></cm-file-upload>` },
      { title: 'Required with error', html: `<cm-file-upload name="kyc" label="Address proof" required error="Upload an address proof to continue"></cm-file-upload>` },
    ],
    states: [
      { title: 'Disabled', description: 'When uploads aren\'t possible yet, for example before the product is saved.',
        html: `<cm-file-upload label="Product images" hint="max. file size 300 KB" disabled></cm-file-upload>` },
    ],
    do: ['State the allowed types and size in `hint`, and enforce them with `accept` and `max-size`.', 'Use `multiple` with `max-files` for galleries.', 'Upload in the background after `change` and show progress elsewhere if it takes more than a moment.'],
    dont: ['Don\'t hide the rules until after an upload fails.', 'Don\'t use it for a single image that can be picked from existing media: use a resource picker (planned).'],
    content: ['Heading says what to add: "Add product images".', 'Hints are lowercase rules: "max. file size 300 KB".', 'Refusals name the file and the rule: "banner.png is larger than 300 KB".'],
    a11y: ['A native file input fills the zone, so it is reachable with Tab, opens with Enter or Space, and accepts dropped files. It is named by the heading and the prompt.', 'Each thumbnail\'s remove button is named "Remove <file name>"; after removing, focus returns to the zone.', 'Refused files and errors are announced (`role="alert"`) and linked with `aria-describedby`; `cm-reject` lists the refused files.', 'Form-associated: submits the files under `name` (use `enctype="multipart/form-data"`), `required` blocks submission, and `form.reset()` clears them.', 'Differs from Figma: the zone is the full width you give it rather than a fixed 869px; thumbnails are 140–186px; the drag handle and the star/download/edit hover actions from the product-image screen are left for a future media manager.'],
    related: ['text-field', 'button'],
  },
  {
    slug: 'option-group', tag: 'cm-option-group', react: 'OptionGroup', name: 'Option group', group: 'Forms',
    responsive: ["Options wrap onto more lines when they don't fit.", "When the window is 640px wide or less, options are 42px tall instead of 46px, with 14px text instead of 16px, and 10px apart instead of 20px."],
    summary: 'Switches a form between a few types, with one always selected.',
    lead: 'A row of outlined buttons under a heading. The selected one is black. It works like a radio group, so it suits choices that change which fields follow, such as the offer type.',
    examples: [
      { title: 'Offer type', html: `<cm-option-group name="offer" label="Select offer type">
  <option value="orders" selected>Orders over</option>
  <option value="categories">Categories</option>
  <option value="product">Specific product</option>
  <option value="product-group">Product group</option>
  <option value="customer-group">Customer group</option>
</cm-option-group>` },
      { title: 'Without a heading', description: 'When the card title already asks the question, name the group with `aria-label`.',
        html: `<cm-option-group name="discount" aria-label="Discount type">
  <option value="percent" selected>Percentage</option>
  <option value="flat">Flat amount</option>
</cm-option-group>` },
      { title: 'Disabled option', html: `<cm-option-group name="delivery" label="Delivery">
  <option value="ship" selected>Ship to customer</option>
  <option value="pickup">Store pickup</option>
  <option value="local" disabled>Local delivery</option>
</cm-option-group>` },
    ],
    states: [
      { title: 'Disabled', description: 'The whole choice is fixed, for example after an offer has started.',
        html: `<cm-option-group label="Offer type" value="percent" disabled>
  <option value="percent">Percentage</option>
  <option value="amount">Fixed amount</option>
  <option value="free">Free shipping</option>
</cm-option-group>` },
    ],
    do: ['Use it for two to six short options that switch what the rest of the form asks.', 'Pre-select the most common option, so one is always selected.', 'Keep labels to one to three words so the row fits.'],
    dont: ['Don\'t use it for actions: use buttons.', 'Don\'t use it to filter a list: use Status tabs.', 'Don\'t use it for long or many options: use a select.'],
    content: ['The heading asks the question: "Select offer type".', 'Option labels are short nouns in sentence case.'],
    a11y: ['A `radiogroup` of `radio` buttons named by the heading.', 'One tab stop on the selected option; arrow keys move and select (skipping disabled options, wrapping at the ends), Home and End jump, Space or Enter selects.', 'Form-associated: submits the selected `value` under `name`, `required` blocks submission, and `form.reset()` restores the initial choice.', 'Differs from Figma: the unselected border is `border-input` and the fill `bg-hover` (Figma uses 60% and 50% black/grey overlays). On mobile, Figma swaps the row for a select; here the buttons shrink to 42px and wrap. Use a `cm-select` yourself if a phone layout needs it.'],
    related: ['radio', 'select'],
  },
  {
    slug: 'tag', tag: 'cm-tag', react: 'Tag', name: 'Tag', group: 'Forms',
    responsive: ["When the window is 640px wide or less, tags are 22px tall and the remove button is 18px."],
    summary: 'Shows a product tag or an applied filter, with an optional remove button.',
    lead: 'A 26px pill with an outline. Removable tags have a small circled × that fires `cm-remove`; your code takes the tag out of the list, for example `tag.addEventListener(\'cm-remove\', () => tag.remove())`, and moves focus to the next tag.',
    examples: [
      { title: 'Product tags', description: 'Tags sit `space-10` apart in both directions.',
        html: `<div class="row" style="gap:var(--cm-space-10)">
  <cm-tag removable>Karnataka</cm-tag>
  <cm-tag removable>Orange</cm-tag>
  <cm-tag removable>Cotton</cm-tag>
  <cm-tag removable>Summer sale</cm-tag>
</div>` },
      { title: 'Applied filters', description: 'Name the remove button with what it removes.',
        html: `<div class="row" style="gap:var(--cm-space-10)">
  <cm-tag removable remove-label="Remove filter: Payment status is Paid">Paid</cm-tag>
  <cm-tag removable remove-label="Remove filter: Order type is Store pickup">Store pickup</cm-tag>
</div>` },
      { title: 'Read-only', html: `<div class="row" style="gap:var(--cm-space-10)">
  <cm-tag>Cotton</cm-tag>
  <cm-tag>Handmade</cm-tag>
</div>` },
    ],
    states: [
      { title: 'Disabled', description: 'Shown but can\'t be removed now.',
        html: `<div class="row" style="gap:var(--cm-space-10)"><cm-tag removable disabled>Cotton</cm-tag><cm-tag removable disabled>Summer</cm-tag></div>` },
    ],
    do: ['Keep tag text to one or two words.', 'After removing a tag, move focus to the next tag or to the field that adds tags, so keyboard users are not lost.', 'Use `remove-label` when the tag text alone doesn\'t say what is removed.'],
    dont: ['Don\'t use tags for status: use a badge.', 'Don\'t make tags clickable links; use buttons or links.'],
    content: ['Write tags as the merchant typed them; don\'t change their case.'],
    a11y: ['The remove button is a real button, named "Remove <tag text>" by default, and reachable with Tab.', 'Its 20px target, with tags 10px apart, meets the 24px target-spacing rule.', 'The outline is `border-strong` (Figma #414141), which meets 3:1 against the tag fill in both themes.'],
    related: ['badge', 'search'],
  },
  {
    slug: 'badge', tag: 'cm-badge', react: 'Badge', name: 'Badge', group: 'Feedback',
    summary: 'Shows the status of an order, payment or other object.',
    lead: 'An uppercase pill with one or two words. Colour says the kind of status; the words say the status.',
    examples: [
      { title: 'Tones', html: `<div class="row">
  <cm-badge tone="information">Order placed</cm-badge>
  <cm-badge tone="success">Accepted</cm-badge>
  <cm-badge tone="critical">Cancelled</cm-badge>
  <cm-badge tone="attention">New</cm-badge>
  <cm-badge>Draft</cm-badge>
</div>` },
      { title: 'Next to a title', description: 'Use the card\'s `title-adornment` slot.',
        html: `<cm-card heading="Order #1042">
  <cm-badge slot="title-adornment" tone="success">Paid</cm-badge>
  <p style="margin:0">2 items · Rs. 2,340</p>
</cm-card>` },
    ],
    do: ['Keep it to one or two words.', 'Use the same word for the same status everywhere in the admin.', 'Information is orange and attention is blue in this system: pick the tone by meaning, not by colour.'],
    dont: ['Don\'t use a badge as a button: it is not interactive.', 'Don\'t rely on colour alone: the words must say the status.'],
    content: ['Write in sentence case; the badge uppercases it.', 'Use the state, not an action: "Paid", not "Pay now".'],
    a11y: ['Text colours meet 4.5:1 on their badge fills in both themes.', 'Not focusable. If the status changes while the page is open, announce it elsewhere (for example with a banner).'],
    related: ['banner', 'card'],
  },
  {
    slug: 'card', tag: 'cm-card', react: 'Card', name: 'Card', group: 'Layout',
    responsive: ['Follows the card\'s own width, not the window. When the heading and its `title-adornment` don\'t fit on one line, the adornment moves under the heading instead of squeezing it (since 1.2).', 'The header actions stay beside the title while the heading keeps about 12 characters of room (or its whole text, if shorter); below that they move under the title. Wide cards keep everything on one row.'],
    summary: 'Groups related content and actions into a section of the page.',
    lead: 'The white section container every admin page is built from.',
    examples: [
      { title: 'Basic', html: `<cm-card heading="Pricing">
  <div class="stack">
    <cm-text-field label="Price" hint="rs." type="number" value="1299"></cm-text-field>
    <cm-text-field label="Compare-at price" hint="rs." type="number"></cm-text-field>
  </div>
</cm-card>` },
      { title: 'Description and actions', html: `<cm-card heading="Shipping" description="How this product is weighed and shipped.">
  <cm-button slot="actions" size="slim">Edit</cm-button>
  <p style="margin:0">0.4 kg · Ships from Bengaluru warehouse</p>
</cm-card>` },
      { title: 'Badges next to the heading', description: 'Put counts or a status in the `title-adornment` slot. On a narrow card (try a phone) the badges move under the heading so it is never squeezed, and the actions move under the title only if the heading would have less than about 12 characters of room.',
        html: `<cm-card heading="Partner tasks" heading-level="3" style="max-width:390px">
  <cm-badge slot="title-adornment" tone="critical">1 overdue</cm-badge>
  <cm-badge slot="title-adornment" tone="attention">2 today</cm-badge>
  <cm-badge slot="title-adornment">4 later</cm-badge>
  <cm-button slot="actions" size="slim">View all</cm-button>
  <p style="margin:0">Call back Priya S. about the bulk order</p>
</cm-card>` },
      { title: 'Flush', description: '`flush` removes the body padding for lists and tables that run edge to edge.',
        html: `<cm-card heading="Recent orders" flush>
  <ul style="list-style:none;margin:0;padding:0">
    <li style="display:flex;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--cm-border-default)">#1042 · Priya S. <cm-badge tone="success">Paid</cm-badge></li>
    <li style="display:flex;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--cm-border-default)">#1041 · Rahul M. <cm-badge tone="information">Order placed</cm-badge></li>
  </ul>
</cm-card>` },
    ],
    states: [
      { title: 'Loading', description: 'Keep the card and its heading; fill the body with skeletons.',
        html: `<cm-card heading="Recent orders" style="max-width:480px">
  <div aria-busy="true" class="stack"><cm-skeleton lines="3"></cm-skeleton></div>
</cm-card>` },
      { title: 'Empty', description: 'Say what will appear here and give the action that fills it.',
        html: `<cm-card heading="Recent orders" flush style="max-width:480px">
  <cm-empty-state size="small" icon="cart" heading="No orders yet">Orders appear here when customers check out.</cm-empty-state>
</cm-card>` },
      { title: 'Error', description: 'Say what couldn\'t load and offer to try again; keep the rest of the page working.',
        html: `<cm-card heading="Recent orders" style="max-width:480px">
  <cm-banner tone="critical" heading="Orders couldn't load">Check your connection and try again.<cm-button slot="actions" size="slim">Try again</cm-button></cm-banner>
</cm-card>` },
    ],
    do: ['Give every card a heading unless it is the only thing on the page.', 'Set `heading-level` so the page outline makes sense (2 under the page title, 3 inside a section).', 'Stack cards `space-10` to `space-20` apart.'],
    dont: ['Don\'t nest cards inside cards: use `bg-inset` panels instead.', 'Don\'t put more than two actions in the header.'],
    content: ['Headings are short nouns: "Pricing", "Shipping", "Variants".', 'The description is one sentence in plain language.'],
    a11y: ['The heading is exposed with `role="heading"` and `aria-level`, so screen-reader users can jump between cards.', 'The card is a labelled region named by its heading.'],
    related: ['badge', 'button'],
  },
  {
    slug: 'page', tag: 'cm-page', react: 'Page', name: 'Page', group: 'Layout',
    responsive: ["Content is at most 1600px wide (800px with `narrow`, no limit with `full-width`), centred.", "Follows the page's own width, not the window: at 640px or narrower the padding around the content drops from 20px to 10px."],
    summary: 'Wraps a whole admin page: the page header, then the content on the page background.',
    lead: 'The outermost element of a screen. The page header runs edge to edge across the top; the content sits on `bg-page` with `space-20` padding (`space-10` when the page is 640px wide or less), up to 1600px wide and centred.',
    examples: [
      { title: 'Detail page', description: 'Page header, then a layout with a main and a side column. This is the shape of every detail page. The columns stack here because the example frame is narrower than 768px.',
        html: `<cm-page>
  <cm-page-header slot="header" heading="Order #1042" breadcrumbs='[{"label":"Orders","href":"#/components/page"}]'>
    <cm-button slot="actions" variant="primary">Fulfil items</cm-button>
  </cm-page-header>
  <cm-layout>
    <cm-layout-section variant="two-thirds">
      <cm-card heading="Items">2 items · Rs. 2,340</cm-card>
      <cm-card heading="Payment">Paid by UPI</cm-card>
    </cm-layout-section>
    <cm-layout-section variant="one-third">
      <cm-card heading="Customer">Priya S.</cm-card>
    </cm-layout-section>
  </cm-layout>
</cm-page>` },
      { title: 'Narrow', description: '`narrow` keeps settings and single-column forms at a readable 800px.',
        html: `<cm-page narrow>
  <cm-page-header slot="header" heading="Store details"></cm-page-header>
  <cm-card heading="Contact">
    <cm-stack>
      <cm-text-field label="Store name" value="Ananya Handlooms"></cm-text-field>
      <cm-text-field label="Support email" type="email"></cm-text-field>
    </cm-stack>
  </cm-card>
</cm-page>` },
    ],
    do: ['Use one `cm-page` per screen, with one page header.', 'Use `full-width` for wide tables and reports, `narrow` for settings forms.', 'Put a save bar or action bar in the `footer` slot, or anywhere on the page: both stick to the bottom.'],
    dont: ['Don\'t add your own page padding or background around it.', 'Inside the admin, don\'t add a header bar or side navigation: the admin draws them around your app.'],
    content: ['The page title in the header names the record or list: "Order #1042", "Products".'],
    a11y: ['Put the page header first so the page title is the first heading.', 'The content keeps its source order on every width.'],
    related: ['page-header', 'layout', 'card'],
  },
  {
    slug: 'layout', tag: 'cm-layout', react: 'Layout', name: 'Layout', group: 'Layout',
    responsive: ["Follows the layout's own width, not the window: below 768px every section takes the full width and they stack in source order. From 768px, `one-half`, `one-third` and `two-thirds` sections sit side by side."],
    parts: [{ tag: 'cm-layout-section', react: 'LayoutSection' }],
    summary: 'Arranges a page into columns: a main column and a side column, halves, or full-width rows.',
    lead: 'A six-track grid of `cm-layout-section`s: `two-thirds` and `one-third` for detail pages, `one-half` for two equal columns, `full` (default) across the page. Each section stacks its cards `space-20` apart. When the layout itself is narrower than 768px, every section goes full width, in source order.',
    examples: [
      { title: 'Main and side columns', html: `<cm-layout>
  <cm-layout-section variant="two-thirds">
    <cm-card heading="Details">Title, description</cm-card>
    <cm-card heading="Pricing">Price, compare-at price</cm-card>
  </cm-layout-section>
  <cm-layout-section variant="one-third">
    <cm-card heading="Status">Active</cm-card>
  </cm-layout-section>
</cm-layout>` },
      { title: 'Halves, then a full row', html: `<cm-layout>
  <cm-layout-section variant="one-half"><cm-card heading="Online store">Rs. 48,200 this week</cm-card></cm-layout-section>
  <cm-layout-section variant="one-half"><cm-card heading="Stores">Rs. 1,12,900 this week</cm-card></cm-layout-section>
  <cm-layout-section><cm-card heading="Recent orders">12 orders today</cm-card></cm-layout-section>
</cm-layout>` },
    ],
    do: ['Put what customers see (details, media, pricing) in the main column and settings and summaries in the side column.', 'Put the main section first in the source: it comes first when the columns stack.', 'Fill a row: `two-thirds` + `one-third`, two `one-half`, or one `full`.'],
    dont: ['Don\'t nest layouts: use a grid inside a card for fields side by side.', 'Don\'t reorder sections with CSS: keyboard and screen-reader order would no longer match what is seen.'],
    content: [],
    a11y: ['Sections never change order, so reading and Tab order follow the page on every width.', 'The layout adds no landmarks or headings: your cards carry the headings.'],
    related: ['page', 'grid', 'card'],
  },
  {
    slug: 'stack', tag: 'cm-stack', react: 'Stack', name: 'Stack', group: 'Layout',
    summary: 'Spaces items evenly in a column or a row, using the spacing scale.',
    lead: 'A column (default) or a row (`direction="inline"`) of items `gap` apart. `gap` takes a spacing step: `0`, `10`, `12`, `15`, `20` (default), `22` or `30`. Rows can wrap, align and spread their items. The items stay in your page, so your styles and forms work as usual.',
    examples: [
      { title: 'Fields in a card', description: '`space-30` between fields, as in the product editor.', html: `<cm-card heading="Details" style="max-width:520px">
  <cm-stack gap="30">
    <cm-text-field label="Title" placeholder="Short sleeve t-shirt"></cm-text-field>
    <cm-text-field label="Description" multiline rows="3"></cm-text-field>
  </cm-stack>
</cm-card>` },
      { title: 'Buttons in a row', html: `<cm-stack direction="inline" gap="10" wrap>
  <cm-button>Export</cm-button>
  <cm-button>Import</cm-button>
  <cm-button variant="primary">Add product</cm-button>
</cm-stack>` },
      { title: 'Spread across a row', html: `<cm-stack direction="inline" justify="space-between">
  <span>Subtotal</span>
  <strong>Rs. 2,340</strong>
</cm-stack>` },
    ],
    do: ['Use the default `20` between cards, `30` between fields in a card, `10` between buttons.', 'Use `wrap` on rows of buttons or tags so they never overflow on phones.'],
    dont: ['Don\'t add margins to the items: the gap does the spacing.', 'Don\'t use a stack for a table-like layout: use a grid.'],
    content: [],
    a11y: ['Order on screen is the order in the source.'],
    related: ['grid', 'layout'],
  },
  {
    slug: 'grid', tag: 'cm-grid', react: 'Grid', name: 'Grid', group: 'Layout',
    responsive: ["Follows the grid's own width, not the window: with `columns`, a grid 640px wide or narrower shows one column.", "With `min-column-width`, it fits as many columns of at least that width as there is room for (never wider than the grid itself), at any width."],
    summary: 'Puts items in equal columns, for fields side by side, tiles and summary cards.',
    lead: '`columns` equal columns (default 2) that become one column when the grid is 640px wide or less, or with `min-column-width`, as many columns as fit, each at least that wide. `gap` takes a spacing step (default `20`).',
    examples: [
      { title: 'Fields side by side', description: 'Two columns while the grid is wider than 640px; one column below that (try Phone).', html: `<cm-card heading="Pricing" style="max-width:760px">
  <cm-grid columns="2">
    <cm-text-field label="Price" hint="rs." type="number"></cm-text-field>
    <cm-text-field label="Compare-at price" hint="rs." type="number"></cm-text-field>
  </cm-grid>
</cm-card>` },
      { title: 'As many as fit', description: '`min-column-width="200px"`: resize the example to see columns come and go. A row of totals is a grid of [[Metric|/components/metric]] tiles.', html: `<cm-grid min-column-width="200px">
  <cm-metric label="Orders" value="128"></cm-metric>
  <cm-metric label="Sales" value="Rs. 2,41,000"></cm-metric>
  <cm-metric label="Visitors" value="3420"></cm-metric>
  <cm-metric label="Returns" value="4"></cm-metric>
</cm-grid>` },
    ],
    do: ['Use two columns for pairs of short fields (price and compare-at price, city and PIN code).', 'Use `min-column-width` for tiles, so the count follows the space.'],
    dont: ['Don\'t put long text fields side by side: give them the full width.', 'Don\'t place a grid inside a horizontal stack: it needs a width to work out its columns.'],
    content: [],
    a11y: ['Items read left to right, then down, the same as the source order.'],
    related: ['stack', 'layout', 'metric'],
  },
  {
    slug: 'banner', tag: 'cm-banner', react: 'Banner', name: 'Banner', group: 'Feedback',
    summary: 'Tells merchants about something important on the page or in their store.',
    lead: 'A full-width message with a tone, an optional heading and actions. Critical banners are announced immediately.',
    examples: [
      { title: 'Tones', html: `<div class="stack" style="gap:var(--cm-space-15)">
  <cm-banner tone="attention" heading="Your store is in test mode">Orders placed now won't be charged.</cm-banner>
  <cm-banner tone="information">GST rates changed on 1 Nov. Check your tax settings.</cm-banner>
  <cm-banner tone="success">Product saved.</cm-banner>
  <cm-banner tone="critical" heading="Payment failed">The card was declined. Ask the customer for another payment method.</cm-banner>
</div>` },
      { title: 'With actions', html: `<cm-banner tone="attention" heading="Connect a payment provider">
  You need one before customers can check out.
  <cm-button slot="actions" variant="primary" size="slim">Set up payments</cm-button>
  <cm-button slot="actions" size="slim">Learn more</cm-button>
</cm-banner>` },
      { title: 'Dismissible', description: 'Fires `cm-dismiss`. Call `preventDefault()` on it to keep the banner open, for example to confirm first.',
        html: `<cm-banner tone="information" dismissible>Your plan renews on 1 Dec.</cm-banner>` },
    ],
    do: ['Put page-level banners at the top of the page, under the title.', 'Lead with what happened, then what to do.', 'Use `critical` only when something has failed or needs action now.'],
    dont: ['Don\'t stack more than two banners: prioritise.', 'Don\'t use a banner for a passing confirmation that needs no action; use an App Bridge toast (`app.toast.show`) when your app runs in the admin.'],
    content: ['Headings are a short statement: "Payment failed", not "Error!".', 'Body copy is one or two sentences.', 'Action labels follow the button rules.'],
    a11y: ['`critical` uses `role="alert"` and interrupts the screen reader; other tones use `role="status"`.', 'The dismiss button has an accessible name ("Dismiss") and a focus ring.', 'Text on every banner fill meets 4.5:1 in both themes.'],
    related: ['badge', 'button'],
  },
  {
    slug: 'icon', tag: 'cm-icon', react: 'Icon', name: 'Icon', group: 'Images and icons',
    summary: 'Draws one of the Commmerce line icons.',
    lead: 'Icons inherit the text colour and are decorative unless you give them a label.',
    examples: [
      { title: 'Basic', html: `<div class="row">
  <cm-icon name="home"></cm-icon><cm-icon name="cart"></cm-icon><cm-icon name="box"></cm-icon><cm-icon name="users"></cm-icon><cm-icon name="chart"></cm-icon><cm-icon name="settings"></cm-icon>
</div>` },
      { title: 'Sizes', description: '16px in buttons, 18px in the header and navigation, 24px on their own.',
        html: `<div class="row"><cm-icon name="bell" size="16"></cm-icon><cm-icon name="bell" size="18"></cm-icon><cm-icon name="bell" size="24"></cm-icon><cm-icon name="bell" size="32"></cm-icon></div>` },
      { title: 'Colour', description: 'Set `color` on the icon or its parent. Use the icon tokens.',
        html: `<div class="row">
  <cm-icon name="check-circle" size="24" style="color:var(--cm-icon-success)"></cm-icon>
  <cm-icon name="x-circle" size="24" style="color:var(--cm-icon-critical)"></cm-icon>
  <cm-icon name="clock" size="24" style="color:var(--cm-icon-default)"></cm-icon>
</div>` },
      { title: 'Meaningful icon', description: 'When the icon is the only thing that carries the meaning, give it a `label`.',
        html: `<span style="display:inline-flex;align-items:center;gap:8px">Stock <cm-icon name="alert" label="Low stock" style="color:var(--cm-icon-critical)"></cm-icon></span>` },
    ],
    do: ['Pair icons with text in navigation and buttons.', 'Use the same icon for the same thing everywhere.'],
    dont: ['Don\'t use icons from other sets next to these: stroke weights won\'t match.', 'Don\'t resize below 16px.'],
    content: ['A `label` describes meaning, not the picture: "Low stock", not "Warning triangle".'],
    a11y: ['Hidden from screen readers by default (`aria-hidden`).', 'With `label`, exposed as an image with that name.', 'Meaningful icons use colours with at least 3:1 contrast (`icon-default` is 3.4:1).'],
    related: ['button', 'avatar', 'thumbnail'],
  },
  {
    slug: 'avatar', tag: 'cm-avatar', react: 'Avatar', name: 'Avatar', group: 'Images and icons',
    summary: 'Shows a person or a store as a photo or their initials.',
    lead: 'Round for people, square for stores. Without a photo it shows the initials of `name` on the avatar green, and without a name a person or store icon.',
    examples: [
      { title: 'People', html: `<div class="row">
  <cm-avatar name="Asha Rao" size="small"></cm-avatar>
  <cm-avatar name="Asha Rao"></cm-avatar>
  <cm-avatar name="Asha Rao" size="large"></cm-avatar>
  <cm-avatar></cm-avatar>
</div>` },
      { title: 'Stores', description: '`shape="square"` for stores and businesses.',
        html: `<div class="row">
  <cm-avatar shape="square" name="Indiranagar store"></cm-avatar>
  <cm-avatar shape="square"></cm-avatar>
</div>` },
      { title: 'Next to the name', description: 'When the name is written beside it, mark the avatar `decorative` so screen readers don\'t hear the name twice.',
        html: `<div class="row" style="gap:var(--cm-space-10)">
  <cm-avatar name="Rahul Mehta" decorative></cm-avatar>
  <span>Rahul Mehta · Store manager</span>
</div>` },
    ],
    states: [
      { title: 'Photo failed to load', description: 'A broken or missing photo falls back to the initials. The example\'s `src` is a deliberately broken image.',
        html: `<cm-avatar name="Priya Shah" src="data:image/png;base64,AAAA"></cm-avatar>` },
    ],
    do: ['Use the person\'s full name, so the initials and the accessible name are right.', 'Use square avatars for stores, round ones for people.'],
    dont: ['Don\'t use an avatar for products: use a thumbnail.', 'Don\'t make the avatar the only way to tell people apart in a list: show the name too.'],
    content: ['Pass the name as the merchant entered it; the avatar takes the first letters of the first and last word.'],
    a11y: ['An image named after `name`, unless `decorative` (then hidden).', 'Initials are dark text on `avatar-bg` (AA in both themes).', 'Without a name it is hidden from screen readers: give it a name if it carries meaning.'],
    related: ['thumbnail', 'header-bar'],
  },
  {
    slug: 'thumbnail', tag: 'cm-thumbnail', react: 'Thumbnail', name: 'Thumbnail', group: 'Images and icons',
    summary: 'Shows a small product or file image in a fixed square.',
    lead: 'The whole image fits the box (never cropped) on a grey backdrop, so product photos of any shape line up in lists. Without an image, or when it fails to load, it shows a placeholder.',
    examples: [
      { title: 'Sizes', description: '40px in dense lists, 60px in resource lists, 80px on detail pages.',
        html: `<div class="row">
  <cm-thumbnail size="small" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 60'%3E%3Crect width='40' height='60' rx='6' fill='%23327EC2'/%3E%3C/svg%3E"></cm-thumbnail>
  <cm-thumbnail alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 60'%3E%3Crect width='40' height='60' rx='6' fill='%23327EC2'/%3E%3C/svg%3E"></cm-thumbnail>
  <cm-thumbnail size="large" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 60'%3E%3Crect width='40' height='60' rx='6' fill='%23327EC2'/%3E%3C/svg%3E"></cm-thumbnail>
</div>` },
      { title: 'In a list', description: 'Next to the product name, the image is decorative: leave `alt` empty. Use `loading="lazy"` in long lists.',
        html: `<div class="row" style="gap:var(--cm-space-10)">
  <cm-thumbnail size="small" loading="lazy"></cm-thumbnail>
  <span>Blue cotton kurta · 12 in stock</span>
</div>` },
    ],
    states: [
      { title: 'No image', description: 'A placeholder box; with `alt`, screen readers hear "<alt> (no image)".',
        html: `<cm-thumbnail alt="Blue cotton kurta"></cm-thumbnail>` },
    ],
    do: ['Describe what the image shows in `alt` when nothing next to it does: "Blue cotton kurta, front".', 'Keep every thumbnail in one list the same size.'],
    dont: ['Don\'t use a thumbnail for people or stores: use an avatar.', 'Don\'t write "image of" in `alt`.'],
    content: ['Write `alt` as a short phrase in sentence case, without a full stop.'],
    a11y: ['An empty `alt` makes the image decorative.', 'The placeholder icon is decorative; the box is named from `alt` when it has one.'],
    related: ['avatar', 'resource-list'],
  },
  {
    slug: 'tooltip', tag: 'cm-tooltip', react: 'Tooltip', name: 'Tooltip', group: 'Overlays',
    responsive: ["At most 280px wide, and never wider than the window minus 16px.", "Positioned against the window: if the bubble doesn't fit on its `placement` side but fits on the opposite one, it flips, and it always stays 8px inside the window. It is placed again when the page scrolls or the window is resized."],
    summary: 'Explains a control in a few words when it is hovered or focused.',
    lead: 'A small dark label next to one control. It appears on hover after a short delay and at once on keyboard focus, stays while the pointer is on the control or the tooltip, and Esc closes it. The text is also the control\'s accessible description.',
    examples: [
      { title: 'Icon button', description: 'An icon-only button still needs its own name: here, visually hidden text. The tooltip adds a description.',
        html: `<cm-tooltip content="Download this report as a CSV file">
  <cm-button><cm-icon slot="icon" name="download" size="16"></cm-icon><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap">Download</span></cm-button>
</cm-tooltip>` },
      { title: 'Placement', description: 'It flips to the other side when there is no room.',
        html: `<div class="row" style="gap:var(--cm-space-20);padding:40px 0">
  <cm-tooltip content="Above" placement="top"><cm-button>Top</cm-button></cm-tooltip>
  <cm-tooltip content="Below" placement="bottom"><cm-button>Bottom</cm-button></cm-tooltip>
  <cm-tooltip content="Before" placement="start"><cm-button>Start</cm-button></cm-tooltip>
  <cm-tooltip content="After" placement="end"><cm-button>End</cm-button></cm-tooltip>
</div>` },
      { title: 'Explaining a field', html: `<cm-tooltip content="Shown to customers at checkout">
  <cm-text-field label="Display name"></cm-text-field>
</cm-tooltip>` },
    ],
    do: ['Keep it under about 80 characters, one sentence or less.', 'Use it to explain icons and abbreviations.'],
    dont: ['Don\'t put links, buttons or other controls in a tooltip: it can\'t be reached.', 'Don\'t hide information a merchant needs to finish a task: put it in help text.', 'Don\'t add a tooltip that repeats the button text.', 'Don\'t wrap a disabled control: it can\'t be focused, so keyboard users never see the tooltip.'],
    content: ['Write in sentence case without a full stop for fragments.', 'Say what the control does, not what it looks like.'],
    a11y: ['The text becomes the control\'s accessible description: `aria-describedby` on native controls, an element reference on the control inside a component.', 'It describes, it doesn\'t name: icon-only buttons need their own name.', 'With `visual-only`, the text is shown but not added as a description: use it only when it repeats the control\'s accessible name, as the collapsed Side navigation does with its item labels, so screen readers don\'t hear it twice.', 'Hover over it, keep it open while needed and dismiss it with Esc (WCAG 1.4.13).', 'White on near-black (`text-on-dark` on `bg-panel-header`), AA in both themes.'],
    related: ['button', 'icon'],
  },
  {
    slug: 'page-header', tag: 'cm-page-header', react: 'PageHeader', name: 'Page header', group: 'Layout',
    responsive: ["When the window is 640px wide or less, the breadcrumbs are replaced by a back link to the parent page, the title is 18px, and the header is at least 50px tall and stays on one line."],
    summary: 'Tops every admin page with breadcrumbs, the page title and the page\'s main actions.',
    lead: 'An 80px white bar: breadcrumbs (14px) over a 26px title on the left, large buttons on the right. The Figma file calls it the "Save Bar". Pass the parent pages as `breadcrumbs`; the title is added as the current page. On phones it is 50px and the breadcrumbs become a back arrow to the parent page.',
    examples: [
      { title: 'Edit page', description: 'Secondary actions first, the primary action last, `space-20` apart.',
        html: `<cm-page-header heading="Add product" breadcrumbs='[{"label":"Dashboard","href":"#"},{"label":"Products","href":"#"}]'>
  <cm-button slot="actions" size="large">Duplicate</cm-button>
  <cm-button slot="actions" size="large">Cancel</cm-button>
  <cm-button slot="actions" size="large" variant="primary">Save</cm-button>
</cm-page-header>` },
      { title: 'Record with previous/next', description: '`pagination` adds arrows that fire `cm-previous` and `cm-next`; enable them with `has-previous` and `has-next`.',
        html: `<cm-page-header heading="Order #ODYOD0744" breadcrumbs='[{"label":"Orders","href":"#"}]' pagination has-previous has-next>
  <cm-badge slot="title-adornment" tone="information">Order placed</cm-badge>
  <cm-button slot="actions" size="large" variant="primary">Fulfil</cm-button>
</cm-page-header>` },
      { title: 'List page', description: 'A count next to the title and import/export actions.',
        html: `<cm-page-header heading="Products">
  <cm-badge slot="title-adornment">39</cm-badge>
  <cm-button slot="actions" size="large">Import</cm-button>
  <cm-button slot="actions" size="large">Export</cm-button>
  <cm-button slot="actions" size="large" variant="primary">Add product</cm-button>
</cm-page-header>` },
    ],
    do: ['Use one page header per page, at the top.', 'Keep it to three actions; put the rest in an action menu.', 'Make the title the same words as the link that led here.'],
    dont: ['Don\'t include the current page in `breadcrumbs`: it is added from `heading`.', 'Don\'t use it inside cards or panels.', 'Don\'t use it to ask about unsaved changes: use the save bar.'],
    content: ['Titles are nouns or short verb phrases: "Products", "Add product", "Order #1042".', 'Breadcrumbs use the page names from navigation.'],
    a11y: ['The title is the page\'s `<h1>`.', 'Breadcrumbs are a `nav` named "Breadcrumb" with an ordered list; the current page has `aria-current="page"`.', 'The phone back arrow is a link named "Back to <parent>". Previous/next arrows are buttons named "Previous" and "Next", disabled at the ends.', 'Differs from Figma: the arrow buttons use the `border-input` edge so they meet 3:1; Figma\'s "Save Bar" with a search field on mobile is left to the search component.'],
    related: ['action-bar', 'save-bar', 'button'],
  },
  {
    slug: 'action-bar', tag: 'cm-action-bar', react: 'ActionBar', name: 'Action bar', group: 'Layout',
    responsive: ["When the window is 640px wide or less, the bar is at least 68px tall instead of 80px, with 10px padding, a 14px heading and a 30px icon.", "The actions move under the text when there is no room for both side by side (the text keeps at least 280px)."],
    summary: 'Keeps a record\'s name and its main actions in reach at the bottom of long pages.',
    lead: 'An 80px bar (the Figma "Bottom Tab"): a 14px eyebrow and optional badge over a 20px record name, large buttons on the right. Add `sticky` to pin it to the bottom of the scrolling area. With `tone="critical"` it explains a blocking error and offers the fix.',
    examples: [
      { title: 'Order actions', description: 'Badge in the `adornment` slot, extra content (an amount) in the default slot.',
        html: `<cm-action-bar eyebrow="#ODYOD0744">
  <cm-badge slot="adornment" tone="information">Order placed</cm-badge>
  <p style="margin:0;font-size:20px;font-weight:600">Amount payable: ₹2,234.00</p>
  <cm-button slot="actions" size="large">Cancel order</cm-button>
  <cm-button slot="actions" size="large">Mark as processing</cm-button>
  <cm-button slot="actions" size="large" variant="primary">Mark as paid</cm-button>
</cm-action-bar>` },
      { title: 'Record name', html: `<cm-action-bar eyebrow="Add product" heading="Brocato Mobster Golden TR90 Rimless Square Eyeglasses">
  <cm-button slot="actions" size="large">Cancel</cm-button>
  <cm-button slot="actions" size="large" variant="primary">Save</cm-button>
</cm-action-bar>` },
      { title: 'Blocking error', description: 'Says what is wrong and offers one button that fixes it.',
        html: `<cm-action-bar tone="critical" heading="Tax could not be calculated. Choose a tax rate for this order.">
  <cm-button slot="actions" size="large" variant="primary">Change tax rate</cm-button>
</cm-action-bar>` },
    ],
    do: ['Use it on long forms and order pages where the page header scrolls away.', 'Repeat the same actions as the page header, in the same order.', 'Give critical bars one action that fixes the problem.'],
    dont: ['Don\'t show more than three buttons; on phones keep one and move the rest into a menu.', 'Don\'t use it for unsaved changes: use the save bar.', 'Don\'t stack two action bars.'],
    content: ['Critical messages say what happened and what to do: "Tax could not be calculated. Choose a tax rate."', 'Button labels are verbs: "Mark as paid", not "Paid".'],
    a11y: ['A `region` named by the heading (or `label`), so screen-reader users can jump to it.', 'Critical headings have `role="alert"`, so they are announced when the bar appears or the text changes.', 'Text on the critical fill (`bg-error-bar`) meets 4.5:1 and the red icon meets 3:1, both themes (checked on every build).', 'Differs from Figma: the warning icon is our vector `alert` icon on a white circle (Figma uses a PNG on a pink circle); on phones the extra buttons stay visible and wrap instead of moving into a "more" menu — compose that with an action menu when it ships.'],
    related: ['page-header', 'save-bar', 'banner'],
  },
  {
    slug: 'save-bar', tag: 'cm-save-bar', react: 'SaveBar', name: 'Save bar', group: 'Layout',
    responsive: ["The buttons move under the message when there is no room for both side by side (the message keeps at least 200px).", "When the window is 640px wide or less, the bar is at least 68px tall instead of 80px, with 10px padding and a 14px message."],
    summary: 'Asks the merchant to save or discard unsaved changes.',
    lead: 'A bar with a message, Discard and Save, hidden until there are unsaved changes. Set `open` yourself, or point `form` at a form\'s ID: the bar opens when a field changes, Save submits the form and Discard resets it. Both events are cancelable, so you can confirm or save with your own code instead. It sticks to the bottom of the scrolling area.',
    examples: [
      { title: 'Watching a form', description: 'Type in the field to open the bar. Discard puts the old value back.',
        html: `<form id="product-form" class="stack" onsubmit="event.preventDefault(); this.nextElementSibling.open = false">
  <cm-text-field label="Title" name="title" value="Ceramic mug"></cm-text-field>
</form>
<cm-save-bar form="product-form"></cm-save-bar>` },
      { title: 'Open, with your own handlers', description: 'Set `loading` while saving; `save-disabled` while the form has errors.',
        html: `<cm-save-bar open message="Do you want to save changes before closing?" discard-label="Cancel"></cm-save-bar>` },
    ],
    states: [
      { title: 'Saving', description: '`loading` while the request runs: Save shows a spinner and both buttons are blocked.',
        html: `<cm-save-bar open loading message="Unsaved changes"></cm-save-bar>` },
      { title: 'Save failed', description: 'Keep the bar open and everything typed; say what went wrong above the form.',
        html: `<div class="stack">
  <cm-banner tone="critical" heading="Changes couldn't be saved">The price must be more than 0. Fix it and save again.</cm-banner>
  <cm-save-bar open message="Unsaved changes"></cm-save-bar>
</div>` },
    ],
    do: ['Show it as soon as anything changes, and hide it after saving or discarding.', 'Keep the merchant on the page if they try to leave with unsaved changes.', 'Set `loading` while the save request runs.'],
    dont: ['Don\'t use it on pages that save straight away (toggles, for example).', 'Don\'t add other actions to it: use the action bar.', 'Don\'t show it alongside an action bar with its own Save button.'],
    content: ['The message is short: "Unsaved changes" or a question such as "Save changes before closing?".', 'Keep the labels "Save" and "Discard" unless the context needs "Cancel".'],
    a11y: ['The message is a `status` live region, so it is announced when the bar opens.', 'The bar is a `region` named by the message; buttons are real buttons in a sensible tab order (Discard, then Save).', 'While `loading`, Save shows a spinner with `aria-busy` and both buttons are blocked.', 'Differs from Figma: there is no dedicated "unsaved changes" frame on desktop, so this uses the "Bottom Tab" layout (Figma\'s skeleton shows Discard / Save) and the mobile "save changes before close?" variant.'],
    related: ['page-header', 'action-bar', 'button'],
  },
  {
    slug: 'info-panel', tag: 'cm-info-panel', react: 'InfoPanel', name: 'Info panel', group: 'Layout',
    parts: [{ tag: 'cm-info-item', react: 'InfoItem' }],
    summary: 'Lists the facts about a record as label/value pairs, in the side column of detail pages.',
    lead: 'A card (the Figma "Additional Info Card", 380px in the side column) with a 20px title, an optional uppercase text action, and `cm-info-item`s: a 16px label over a 16px medium value. Values can be text, badges or tags. `half` puts two short facts on one line.',
    examples: [
      { title: 'Order details', html: `<div style="max-width:380px">
<cm-info-panel heading="Order details" action="Remove" action-label="Remove order details">
  <cm-info-item label="Ordered on">Mar 29, 2023 3:45 AM</cm-info-item>
  <cm-info-item label="Order status"><cm-badge tone="information">Order placed</cm-badge></cm-info-item>
  <cm-info-item label="Order type">Store pickup</cm-info-item>
  <cm-info-item label="Payment status"><cm-badge tone="success">Accepted</cm-badge></cm-info-item>
  <cm-info-item label="Transaction ID">098765432108976</cm-info-item>
  <cm-info-item label="SKU" half>OD673892</cm-info-item>
  <cm-info-item label="Inventory available" half>8202</cm-info-item>
  <cm-info-item label="Product tags">
    <cm-tag removable>Yellow</cm-tag><cm-tag removable>Cotton</cm-tag><cm-tag removable>Summer</cm-tag>
  </cm-info-item>
</cm-info-panel>
</div>` },
    ],
    states: [
      { title: 'Loading', description: 'Keep the heading; show skeleton lines for the values.',
        html: `<div style="max-width:380px"><cm-info-panel heading="Order details">
  <div aria-busy="true"><cm-skeleton lines="4"></cm-skeleton></div>
</cm-info-panel></div>` },
    ],
    do: ['Put it in the side column of detail pages, next to the main cards.', 'Use `half` only for short values that fit side by side.', 'Name the header action with `action-label` when "Remove" alone is unclear.'],
    dont: ['Don\'t put form fields in it: use a card.', 'Don\'t use it for long text: values should be one line or a few tags.'],
    content: ['Labels are sentence-case nouns: "Ordered on", "Payment status".', 'Write values the way the merchant sees them elsewhere (same date format, same status words).'],
    a11y: ['The panel is a region named by its heading; the items are a list, each a list item, so screen readers announce "list, 8 items" and read each label before its value.', 'The header action is a real button; it fires `cm-action`.', 'Differs from Figma: the uppercase action uses `tracking-caps` (0.16em) like other caps text, and the panel takes the width you give it rather than a fixed 380px.'],
    related: ['card', 'badge', 'tag'],
  },
  {
    slug: 'accordion', tag: 'cm-accordion', react: 'Accordion', name: 'Accordion', group: 'Layout',
    responsive: ["When the window is 640px wide or less, the header row is at least 50px tall with 14px text, and the chevron circle shrinks from 34px to 28px."],
    summary: 'Shows or hides extra detail under a row, inside side panels and cards.',
    lead: 'A 60px bordered row with 16px text and a 34px round chevron; the detail opens below a divider. Each accordion opens on its own; stack them `space-10` apart.',
    examples: [
      { title: 'Customer matches', html: `<div class="stack" style="gap:var(--cm-space-10);max-width:480px">
  <cm-accordion heading="Email and phone found in an abandoned cart">
    <p style="margin:0">Cart from 18-12-2022 · 3 items · Rs. 1,240</p>
  </cm-accordion>
  <cm-accordion heading="Email and phone found in 2 orders" open>
    <p style="margin:0">#NAYOD0736 · 20-12-2022<br>#NAYOD0741 · 02-01-2023</p>
  </cm-accordion>
</div>` },
    ],
    states: [
      { title: 'Disabled', description: 'Shown but can\'t be opened, for example while its contents load.',
        html: `<div style="max-width:480px"><cm-accordion heading="Email and phone found in 2 orders" disabled><p style="margin:0">#NAYOD0736</p></cm-accordion></div>` },
    ],
    do: ['Use it to tuck away detail that most merchants don\'t need.', 'Write the row so it says what is inside: "Found in 2 orders".', 'Set `heading-level` to fit the page outline.'],
    dont: ['Don\'t hide information needed to finish the task.', 'Don\'t nest accordions.', 'Don\'t use it for navigation: use tabs or links.'],
    content: ['Row text is a short statement in sentence case, no full stop.'],
    a11y: ['The row is a button inside a heading, with `aria-expanded` and `aria-controls`; the detail is a region labelled by the row.', 'Enter or Space opens and closes it; `cm-toggle` reports the new state.', 'The chevron rotation respects reduced motion.', 'Built from the written guidance in the design-system artifact: the Figma file has no separate accordion page, so measurements come from the side-popup screens.'],
    related: ['card', 'info-panel'],
  },
  {
    slug: 'empty-state', tag: 'cm-empty-state', react: 'EmptyState', name: 'Empty state', group: 'Feedback',
    responsive: ["When the window is 640px wide or less, the large size draws like the small one: a 200px circle and a 14px heading."],
    summary: 'Fills a list or page that has nothing in it yet, and offers the next step.',
    lead: 'A 250px soft circle with an illustration, a 16px line saying what is missing, and one primary action 20px below. Inside cards and on mobile the circle is 200px and the button medium.',
    examples: [
      { title: 'No products', html: `<cm-empty-state heading="No products found">
  <cm-button slot="actions" variant="primary" size="large">Add product</cm-button>
</cm-empty-state>` },
      { title: 'Inside a card, with supporting text', html: `<cm-card heading="Orders" style="max-width:420px">
  <cm-empty-state size="small" icon="cart" heading="No orders yet">
    Orders appear here when customers check out.
    <cm-button slot="actions" variant="primary">Share your store</cm-button>
  </cm-empty-state>
</cm-card>` },
      { title: 'Inline, for an empty list inside a card', description: '`size="inline"` says "nothing here" in one or two left-aligned lines, with no circle and no extra height, so an empty card is no taller than a full one. The heading is bold, the supporting text follows it on the same line, an optional 20px `icon` sits in front (set `icon=""` for text only), and `action` adds one text action that fires `cm-action` (or is a link with `action-href`). Since 1.2.',
        html: `<div class="row" style="align-items:flex-start">
  <cm-card heading="Customer tasks" style="flex:1 1 260px;max-width:360px">
    <cm-empty-state size="inline" icon="tasks" heading="Nothing due today." heading-level="3" action="Add task">4 later.</cm-empty-state>
  </cm-card>
  <cm-card heading="Chats" style="flex:1 1 260px;max-width:360px">
    <cm-empty-state size="inline" icon="" heading="No chats waiting." heading-level="3"></cm-empty-state>
  </cm-card>
</div>` },
    ],
    do: ['Say what is missing and what to do next.', 'Inside a card, panel, table or list that sits next to full ones, use `size="inline"`: one line, at most one text action.', 'Offer one primary action; add a link only if there is a real second path.', 'Use your own illustration in the `image` slot or `image` attribute when you have one.'],
    dont: ['Don\'t use it for errors: use a critical banner.', 'Don\'t use it for search with no results without saying how to widen the search.', 'Don\'t show it while data is loading: use a skeleton.'],
    content: ['Heading in sentence case: "No products found". Figma\'s " !" is dropped.', 'Supporting text is one sentence about what will appear and when.'],
    a11y: ['The heading is a real heading (`heading-level`, default 2) so screen-reader users find it in the outline.', 'The illustration is decorative and hidden from assistive technology.', 'Differs from Figma: the box-and-bee illustration is a PNG in Figma, so the default circle shows a system icon (`icon`, default `box`); pass your own artwork in the `image` slot.'],
    related: ['skeleton', 'banner', 'button'],
  },
  {
    slug: 'toast', tag: 'cm-toast', react: 'Toast', name: 'Toast', group: 'Feedback',
    responsive: ["At most 480px wide, and never wider than the window minus 32px."],
    parts: [{ tag: 'cm-toast-region', react: 'ToastRegion' }],
    summary: 'A short confirmation at the bottom of the screen that goes away on its own.',
    lead: 'One sentence on a dark bar, bottom centre, 48px tall with a 4px radius: "Product saved". Show it with `showToast()`, which keeps one polite live region on the page so every toast is announced. It stays 5 seconds (10 with an action), and pauses while the pointer or focus is on it.',
    examples: [
      { title: 'Show a toast', description: 'Call `showToast(message, { tone, duration, action })`. Each button here calls it.',
        html: `<div class="row">
  <cm-button data-toast="Product saved">Save product</cm-button>
  <cm-button data-toast="Order archived" data-toast-action="Undo">Archive order</cm-button>
  <cm-button data-toast="Couldn't save product. Check your connection." data-toast-tone="critical">Fail to save</cm-button>
</div>` },
      { title: 'Default', description: 'A toast element on its own carries its own live region; set `open` to show it again.',
        html: `<cm-toast message="Product saved" duration="10000"></cm-toast>` },
      { title: 'With an action', html: `<cm-toast message="3 orders archived" action-label="Undo" duration="10000"></cm-toast>` },
      { title: 'Critical', description: 'Also show the error where it happened: a toast disappears, so it must never be the only place.',
        html: `<cm-toast tone="critical" message="Couldn't save product" duration="10000"></cm-toast>` },
    ],
    do: ['Confirm something the merchant just did: "Product saved", "Order archived".', 'Offer Undo for actions that are easy to reverse.', 'Use `showToast()` so toasts stack in one place and are announced.'],
    dont: ['Don\'t use a toast as the only sign of an error: show the error next to what failed (a banner or field error) too.', 'Don\'t put essential information or links the merchant must follow in a toast.', 'Don\'t show more than one toast for one action.'],
    content: ['Noun and past-tense verb: "Product saved", not "Your product has been saved successfully!".', 'About 50 characters at most, one sentence, no full stop for confirmations.', 'Action labels are one verb: "Undo", "View".'],
    a11y: ['`showToast()` adds toasts to `cm-toast-region`, a polite `role="status"` region, so screen readers announce them without moving focus.', 'Hovering or focusing a toast pauses its timer; it never closes in under 2 seconds, and stays 10 seconds when it has an action.', 'The Dismiss and action buttons are real buttons with visible focus rings; text is white on black (or black on the error tint) and meets 4.5:1 in both themes.'],
    related: ['banner', 'spinner', 'progress-bar'],
  },
  {
    slug: 'spinner', tag: 'cm-spinner', react: 'Spinner', name: 'Spinner', group: 'Feedback',
    summary: 'Shows that something is loading when the wait is short or of unknown length.',
    lead: 'A turning arc: 20px (`small`) inside buttons, rows and fields, 44px (`large`) for a section. The arc is `border-strong` on a `border-default` track.',
    examples: [
      { title: 'Sizes', html: `<div class="row" style="align-items:center;gap:var(--cm-space-30)">
  <cm-spinner size="large"></cm-spinner>
  <cm-spinner size="small"></cm-spinner>
</div>` },
      { title: 'Loading a section', description: 'Mark the region busy and name what is loading.',
        html: `<cm-card heading="Recent orders">
  <div aria-busy="true" style="display:flex;justify-content:center;padding:var(--cm-space-30)">
    <cm-spinner accessible-label="Loading recent orders"></cm-spinner>
  </div>
</cm-card>` },
    ],
    do: ['Use it for waits of about 1 to 10 seconds where the length is unknown.', 'Name what is loading with `accessible-label` when there is more than one on the page.', 'Use a button\'s own `loading` state for button actions.'],
    dont: ['Don\'t use it for a whole page\'s first load: use a skeleton display.', 'Don\'t use it when you know how far along the task is: use a progress bar.', 'Don\'t show several spinners for one task.'],
    content: ['The label is "Loading" or "Loading <thing>": no ellipsis, no "please wait".'],
    a11y: ['A `role="status"` with hidden text, so the label is announced; the graphic is hidden from screen readers.', 'The arc meets 3:1 against the page and card backgrounds in both themes.', 'Under reduced motion it turns three times slower.'],
    related: ['progress-bar', 'skeleton', 'button'],
  },
  {
    slug: 'progress-bar', tag: 'cm-progress-bar', react: 'ProgressBar', name: 'Progress bar', group: 'Feedback',
    summary: 'Shows how far a longer task has got, such as an import or a bulk update.',
    lead: 'A label above an 8px (`medium`) or 4px (`small`) rounded track in `bg-inset`, filled with `action-primary`. Without a `value` it is indeterminate: a segment slides along the track.',
    examples: [
      { title: 'Determinate', html: `<cm-progress-bar label="Importing 1,240 products" value="62" show-value style="max-width:520px"></cm-progress-bar>` },
      { title: 'Indeterminate', description: 'Leave out `value` when you can\'t tell how far along it is.',
        html: `<cm-progress-bar label="Syncing inventory with your stores" style="max-width:520px"></cm-progress-bar>` },
      { title: 'Small, in a card', html: `<cm-card heading="Bulk price update">
  <div class="stack">
    <p style="margin:0">Updating 350 products. You can leave this page.</p>
    <cm-progress-bar label="Bulk price update" label-hidden size="small" value="30"></cm-progress-bar>
  </div>
</cm-card>` },
    ],
    states: [
      { title: 'Finished', description: 'At 100%, replace the bar with the result (a banner or toast) rather than leaving it full.',
        html: `<cm-progress-bar label="Importing 1,240 products" value="100" show-value style="max-width:520px"></cm-progress-bar>` },
    ],
    do: ['Use it for tasks over about 10 seconds, and say what is happening in the label.', 'Update `value` at least every few seconds, so it never looks stuck.', 'Tell the merchant whether they can leave the page.'],
    dont: ['Don\'t use it for short waits: use a spinner.', 'Don\'t let a determinate bar go backwards.'],
    content: ['Label in the present continuous with the amount: "Importing 1,240 products".'],
    a11y: ['A WAI-ARIA `progressbar` named by its label, with `aria-valuenow` (0–100) when determinate and no value when indeterminate.', '`label-hidden` keeps the name for screen readers when the text around it already says what is running.', 'The fill meets 3:1 against the track and page in both themes; under reduced motion the indeterminate segment moves three times slower.'],
    related: ['spinner', 'toast', 'banner'],
  },
  {
    slug: 'skeleton', tag: 'cm-skeleton', react: 'Skeleton', name: 'Skeleton', group: 'Feedback',
    summary: 'Grey placeholder shapes shown where content is loading.',
    lead: 'Lines, square thumbnails (34, 40, 50 or 186px, from the Skeleton Thumbnail board) and blocks in Figma\'s #F9F9F9 (`bg-input-filled`), pulsing gently to `thumb-bg`.',
    examples: [
      { title: 'Product row loading', html: `<div aria-busy="true" style="display:flex;gap:var(--cm-space-15);align-items:center;max-width:520px">
  <cm-skeleton variant="thumbnail" size="large"></cm-skeleton>
  <cm-skeleton lines="2" style="flex:1"></cm-skeleton>
</div>` },
      { title: 'Thumbnail sizes', html: `<div style="display:flex;gap:var(--cm-space-20);align-items:flex-end;flex-wrap:wrap">
  <cm-skeleton variant="thumbnail" size="xlarge"></cm-skeleton>
  <cm-skeleton variant="thumbnail" size="large"></cm-skeleton>
  <cm-skeleton variant="thumbnail" size="medium"></cm-skeleton>
  <cm-skeleton variant="thumbnail" size="small"></cm-skeleton>
</div>` },
      { title: 'Block', html: `<cm-skeleton variant="block" style="--cm-skeleton-height:90px;max-width:520px"></cm-skeleton>` },
    ],
    do: ['Match the shape of the content that will replace it.', 'Mark the loading region with `aria-busy="true"` and remove it when content arrives.', 'Use `cm-skeleton-display` for a whole page.'],
    dont: ['Don\'t use skeletons for actions that take under a second.', 'Don\'t mix skeletons and spinners for the same content.'],
    content: ['Skeletons carry no text.'],
    a11y: ['Each skeleton is `aria-hidden`; announce loading on the region (`aria-busy`) or with `cm-skeleton-display`.', 'The pulse stops under reduced motion; in forced-colours mode the shapes get an outline.', 'Shapes are decorative, so they are not part of the contrast checks.'],
    related: ['skeleton-display', 'empty-state'],
  },
  {
    slug: 'skeleton-display', tag: 'cm-skeleton-display', react: 'SkeletonDisplay', name: 'Skeleton display', group: 'Feedback',
    responsive: ["When the window is 768px wide or less, the navigation column is hidden, the body is one column and the header placeholder is 60px tall instead of 80px."],
    summary: 'A whole-page loading placeholder laid out like a detail page.',
    lead: 'An 80px page-header bar, then a main column (472, 90, 90 and 251px cards) and a 30% side column (five cards), 10px apart, as on the Figma Skeleton Display board. On mobile the columns stack.',
    examples: [
      { title: 'Detail page', html: `<cm-skeleton-display style="max-width:760px"></cm-skeleton-display>` },
      { title: 'One column', html: `<cm-skeleton-display layout="one-column" style="max-width:760px"></cm-skeleton-display>` },
    ],
    do: ['Show it only for the first load of a page; later updates should keep the old content visible.', 'Pick the layout closest to the page that will load.'],
    dont: ['Don\'t use `navigation` in apps: the side navigation is admin chrome, for Commmerce products only.', 'Don\'t leave it up if loading fails: replace it with an error banner.'],
    content: ['Change `label` if "Loading" is too vague, e.g. "Loading order".'],
    a11y: ['Announces its `label` once through a status region and sets `aria-busy`; the shapes are hidden.', 'Pulse stops under reduced motion.', 'Differs from Figma: card widths are 70/30 of the space instead of fixed 910/390px, and the 250px navigation placeholder is opt-in.'],
    related: ['skeleton', 'page-header'],
  },
  {
    slug: 'comment', tag: 'cm-comment-box', react: 'CommentBox', name: 'Comment', group: 'Feedback',
    responsive: ["When the window is 640px wide or less, the comment box heading is 16px instead of 20px, the text area starts 100px tall instead of 128px, and the post button moves to the end of the row."],
    parts: [{ tag: 'cm-comment', react: 'Comment' }],
    summary: 'Staff notes on an order or customer: a box to write one and the timeline of earlier ones.',
    lead: 'A 20px "Comments" heading, a 128px text box and a large primary "Post comment" button, 20px apart. Each comment is a bordered 4px-radius box with the time, the text and the author, 10px padding and 10px between comments.',
    examples: [
      { title: 'Order comments', html: `<cm-comment-box style="max-width:720px">
  <cm-comment author="Robinson Painatillo" datetime="2023-02-09T17:07" time="09-02-2023 05:07 PM">Order status changed from processing to partially fulfilled.</cm-comment>
  <cm-comment author="System" datetime="2023-02-09T16:40" time="09-02-2023 04:40 PM">Order cancelled: the payment confirmation period is over.</cm-comment>
</cm-comment-box>` },
      { title: 'A single comment', html: `<cm-comment author="Robinson Painatillo" datetime="2023-02-09T17:07" style="max-width:400px">Called the customer about the delivery address.</cm-comment>` },
    ],
    states: [
      { title: 'Posting', description: 'Set `disabled` while a comment saves, so it isn\'t posted twice.',
        html: `<cm-comment-box disabled value="Called the customer about the delivery address." style="max-width:720px"></cm-comment-box>` },
      { title: 'No comments yet', description: 'An empty box with only the text field is enough; no empty-state message needed.',
        html: `<cm-comment-box style="max-width:720px"></cm-comment-box>` },
    ],
    do: ['Listen for `cm-submit`, save the text, then add a `cm-comment` for it. Call `preventDefault()` to keep the text if saving fails.', 'Set `disabled` while a comment saves.', 'Give `datetime` in ISO format so screen readers and browsers get the exact time.'],
    dont: ['Don\'t use comments for system errors: use a banner.', 'Don\'t edit a posted comment in place without saying so.'],
    content: ['Button: "Post comment".', 'Author is a person\'s name, "System" or the app\'s name.'],
    a11y: ['The box is a section named by its heading; the text box has its own label ("Add a comment").', 'Ctrl/⌘ + Enter posts; an empty box does not post and keeps focus in the box.', 'Comments inside the box form a list; each time is a `<time datetime>`.', 'Differs from Figma: time and author are 12px `text-tertiary` instead of 10px black, so they stay readable; the text box uses the `border-input` edge for contrast.'],
    related: ['text-field', 'card', 'info-panel', 'timeline'],
  },
  {
    slug: 'smart-tip', tag: 'cm-smart-tips', react: 'SmartTips', name: 'Smart tip', group: 'Feedback',
    parts: [{ tag: 'cm-smart-tip', react: 'SmartTip' }],
    summary: 'Short linked tips that lead merchants to guides, with an optional tour banner.',
    lead: 'A dark 60px tour banner, then a white card titled SMART TIPS with 104px tip cards: a 16px title, 14px grey description and a 30px round arrow that turns black on hover and focus.',
    examples: [
      { title: 'Home page tips', html: `<cm-smart-tips tour-heading="Take a tour of Commmerce" style="max-width:340px">
  <cm-smart-tip heading="Manage your own online store" href="#/components/smart-tip">Handle shipping, taxes, payments and more in one place.</cm-smart-tip>
  <cm-smart-tip heading="Shipping and delivery" href="#/components/smart-tip">Set rates and delivery areas.</cm-smart-tip>
  <cm-smart-tip heading="Importing and exporting products" href="#/components/smart-tip">Move products in and out with a CSV file.</cm-smart-tip>
</cm-smart-tips>` },
    ],
    do: ['Keep three to six tips, most useful first.', 'Write the title as the outcome: "Shipping and delivery".', 'Use `target="_blank"` only for help-centre pages outside the admin.'],
    dont: ['Don\'t put actions that change data in a tip: link to the page that does it.', 'Don\'t show the tour banner after the merchant has taken the tour.'],
    content: ['Titles at most two short lines; descriptions one or two lines.', 'The section title is "Smart tips" (shown in capitals).'],
    a11y: ['Each tip is one link, so it is one tab stop and its name is the title plus description.', 'Tips form a list inside a section named by its heading.', 'Links opening a new tab say so to screen readers.', 'Differs from Figma: the tour icon is the system `rocket` (Figma\'s is a PNG); the tour banner uses `bg-panel-header` (#1B1B1B) for Figma\'s #1E1E1E.'],
    related: ['card', 'banner'],
  },
  {
    slug: 'pagination', tag: 'cm-pagination', react: 'Pagination', name: 'Pagination', group: 'Lists',
    responsive: ["When the window is 640px wide or less, rows per page and the \"Showing…\" summary are hidden: only the page field and the previous and next arrows remain, the arrows at either end."],
    summary: 'Moves through a long list or table one page at a time.',
    lead: 'A 60px bar under a list: "Number of rows" on the left, what is showing in the middle, and "Page [n] of N" with 32px previous and next arrows on the right. On phones only the page field and arrows remain.',
    examples: [
      { title: 'Under a product list', html: `<cm-pagination total="290" page="2" page-size="20" resource-name="products"></cm-pagination>` },
      { title: 'Without rows per page', description: 'Set `page-sizes="[]"` when the page size is fixed.', html: `<cm-pagination total="58" page-size="20" page-sizes="[]" style="max-width:480px"></cm-pagination>` },
    ],
    do: ['Listen for `cm-page-change` and `cm-page-size-change`, load that page, then set `page` and `total`.', 'Keep the merchant\'s page and rows per page in the URL so Back works.', 'Put it directly under the list it controls.'],
    dont: ['Don\'t use it for fewer than one page of items: hide it.', 'Don\'t use it inside a modal or picker with a few items: let the list scroll.'],
    content: ['Summary reads "Showing 21–40 of 290 products"; set `resource-name` to the plural noun.', 'Labels are "Number of rows" and "Page … of …" as in Figma.'],
    a11y: ['It is a navigation landmark named "Pagination"; give each one a different `label` if a page has two.', 'The summary is a polite live region, so screen readers hear the new range after a page change.', 'The page field takes a number and commits on Enter or when it loses focus; out-of-range numbers are clamped. Escape restores the current page.', 'Arrows are real buttons named "Previous page" and "Next page", disabled at the ends.', 'Differs from Figma: the rows and page fields use the `border-input` edge (Figma #D6D6D6 is 1.5:1); the summary says "Showing" instead of "Currently viewing"; Figma\'s card shadow is left to the surrounding card.'],
    related: ['resource-list', 'table-header', 'status-tabs'],
  },
  {
    slug: 'status-tabs', tag: 'cm-status-tabs', react: 'StatusTabs', name: 'Status tabs', group: 'Lists',
    responsive: ["Tabs stay on one line; when they don't fit the component's width, the row scrolls sideways.", "When the window is 640px wide or less, tabs are 14px and 18px apart instead of 18px and 28px."],
    summary: 'Filters a list by status, with a count for each status.',
    lead: 'Statuses in an 18px medium row, 28px apart. The chosen one is black with a black underline; the others are grey. Counts sit in brackets after the label. Inside cards and on phones the row is 14px.',
    examples: [
      { title: 'Order statuses', html: `<cm-status-tabs controls="order-list">
  <option value="all" count="233">All</option>
  <option value="unprocessed" count="23" selected>Unprocessed</option>
  <option value="processing" count="23">Processing</option>
  <option value="fulfilled" count="23">Fulfilled</option>
  <option value="delivered" count="23">Delivered</option>
  <option value="returned" count="23">Returned</option>
  <option value="cancelled" count="23">Cancelled</option>
</cm-status-tabs>` },
      { title: 'Small, inside a card', html: `<cm-card heading="Reviews" style="max-width:420px">
  <cm-status-tabs size="small">
    <option value="newest" count="233">Newest</option>
    <option value="highest" count="33">Highest rating</option>
    <option value="lowest">Lowest rating</option>
  </cm-status-tabs>
</cm-card>` },
    ],
    do: ['Put it directly above the list it filters and set `controls` to the list\'s id.', 'Start with "All".', 'Update counts when the list changes.'],
    dont: ['Don\'t use it to move between pages: use links or a page header.', 'Don\'t use it for more than about eight statuses; use a filter instead.', 'Don\'t hide a status with zero items; show "( 0 )".'],
    content: ['One or two words per status, in sentence case.', 'Counts are whole numbers; they are formatted for the merchant\'s locale.'],
    a11y: ['It is an ARIA tab list: one tab stop, ←/→ move and select, Home/End jump to the ends. Disabled tabs are skipped.', 'Each tab\'s name includes its count, so screen readers hear "Unprocessed ( 23 ), tab, 2 of 7".', 'The chosen tab is marked with `aria-selected`, not only colour and underline.', 'Differs from Figma: unselected tabs are `text-tertiary` (#707070) because Figma\'s #9E9E9E is 2.7:1 on white; Figma\'s mobile row is fixed width, ours scrolls sideways.'],
    related: ['resource-list', 'pagination', 'option-group'],
  },
  {
    slug: 'table-header', tag: 'cm-table-header', react: 'TableHeader', name: 'Table header', group: 'Lists',
    summary: 'The grey label bar at the top of a table or list, with sorting and select all.',
    lead: 'A 34px `bg-hover` bar with a `border-subtle` edge and rounded top corners. Column names are 12px; with `selectable` a 20px select-all box leads the row. Rows below share its grid through `--cm-table-columns`.',
    examples: [
      { title: 'Products table', html: `<div role="table" aria-label="Products" style="--cm-table-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 80px">
  <cm-table-header sort="price">
    <option value="product" sortable>Product</option>
    <option value="sku">SKU</option>
    <option value="code">Code</option>
    <option value="price" sortable>Selling price</option>
    <option value="stock" sortable>Stock</option>
    <option value="category">Category</option>
    <option value="status">Status</option>
    <option value="action" align="end">Action</option>
  </cm-table-header>
</div>` },
      { title: 'With select all, on a phone', html: `<div role="table" aria-label="Products" style="max-width:384px;--cm-table-columns: 2fr 1fr 1fr 1fr">
  <cm-table-header selectable indeterminate>
    <option>Product name</option><option>SKU</option><option>Code</option><option align="end">Price</option>
  </cm-table-header>
</div>` },
      { title: 'In a resource list', description: 'Put it in the `header` slot of a `cm-resource-list` and give each row `columns`, with one element per column. The list lines the headings up with the cells, leaving room for the rows\' checkboxes when it is `selectable`. Don\'t set `selectable` on the header here: the select-all box is in the list\'s toolbar. The headings form a plain bar (the rows are a list, not a table), and sort buttons say their state.',
        html: `<cm-resource-list selectable resource-name="lead" style="--cm-table-columns: 1.4fr 1.2fr 1fr 110px">
  <cm-table-header slot="header" sort="name">
    <option value="name" sortable>Name</option><option value="company">Company</option><option value="owner">Owner</option><option value="status">Status</option>
  </cm-table-header>
  <cm-resource-item value="l1" label="Asha Rao" columns><strong>Asha Rao</strong><span>Rao Textiles</span><span>Rahul Kumar</span><span><cm-badge tone="information">New</cm-badge></span></cm-resource-item>
  <cm-resource-item value="l2" label="Ben Cole" columns><strong>Ben Cole</strong><span>Cole &amp; Sons</span><span>Meera Iyer</span><span><cm-badge tone="success">Contacted</cm-badge></span></cm-resource-item>
</cm-resource-list>` },
    ],
    do: ['Put it inside an element with `role="table"` (or a `<table>` wrapper) so it becomes a real header row.', 'Set `--cm-table-columns` once on the table and use the same grid for the rows, with `column-gap: var(--cm-space-20)` and `min-width: 0` on the cells (or `fr` columns written `minmax(0, 1fr)`).', 'Above a `cm-resource-list`, put it in the list\'s `header` slot and set `columns` on the rows: the list lines everything up, checkbox column included.', 'Listen for `cm-sort`, sort the data, then set `sort` and `direction`.'],
    dont: ['Don\'t make every column sortable: only those merchants scan by (name, price, stock, date).', 'Don\'t leave an icon-only column unnamed: add an option with `hidden` so screen readers hear "Actions".', 'Don\'t set `selectable` on a header inside a selectable `cm-resource-list`: there would be two select-all boxes. The list\'s toolbar has one.', 'Don\'t use the rows\' `actions` or `media` slots with column headings: put buttons and thumbnails in a column instead, so the grid stays the same width as the header.'],
    content: ['Column names in sentence case, one or two words: "Selling price", not "Selling Price".'],
    a11y: ['Inside a table it renders `row` and `columnheader` roles; sorted columns carry `aria-sort`.', 'Outside a table it is a plain bar and sort buttons say "sortable" or "sorted ascending/descending".', 'The select-all box is named "Select all" and shows a mixed state when some rows are selected.', 'In a `cm-resource-list` it stays a plain bar: the rows are a list of resources, not table rows, so the headings are a visual guide and each row\'s checkbox and link carry its name.', 'Differs from Figma: the fill is `bg-hover` (#F7F7F7) for Figma\'s #F6F6F6, and sort arrows (not in Figma) appear on hover and on the sorted column.'],
    related: ['resource-list', 'pagination', 'checkbox', 'data-table'],
  },
  {
    slug: 'data-table', tag: 'cm-data-table', react: 'DataTable', name: 'Data table', group: 'Lists',
    responsive: ["A table wider than the component scrolls sideways inside it. With `sticky-first-column`, the first column stays visible while it scrolls."],
    summary: 'Shows numbers and facts in rows and columns, for reports and read-only lists.',
    lead: 'A real table with the Table header look: 12px headings on a `bg-hover` bar, 14px rows divided by `border-default` lines, numbers right-aligned in tabular figures. Columns can sort, a totals row can close the table, and the heading row and first column can stay in view while it scrolls.',
    examples: [
      { title: 'Sales report with totals', description: 'Give it `columns`, `rows` and `totals`. `numeric` and `money` columns align right; sortable columns sort themselves.',
        html: `<cm-data-table caption="Sales by day, 1 to 5 November" sort="day"
  columns='[{"key":"day","label":"Day","type":"date","sortable":true},{"key":"orders","label":"Orders","type":"numeric","sortable":true},{"key":"items","label":"Items sold","type":"numeric"},{"key":"sales","label":"Net sales","type":"money","sortable":true}]'
  rows='[{"day":"2026-11-01","orders":38,"items":61,"sales":"Rs. 48,210"},{"day":"2026-11-02","orders":45,"items":70,"sales":"Rs. 56,980"},{"day":"2026-11-03","orders":29,"items":41,"sales":"Rs. 33,150"},{"day":"2026-11-04","orders":52,"items":88,"sales":"Rs. 71,400"},{"day":"2026-11-05","orders":41,"items":66,"sales":"Rs. 52,075"}]'
  totals='{"day":"Total","orders":205,"items":326,"sales":"Rs. 2,61,815"}'></cm-data-table>` },
      { title: 'Inside a card, wide on a phone', description: 'The card heading names the table, so the caption is kept for screen readers only. `sticky-first-column` keeps the location in view while the merchant scrolls sideways.',
        html: `<cm-card heading="Stock by location" flush style="max-width:384px">
  <cm-data-table caption="Stock by location" caption-hidden sticky-first-column
    columns='[{"key":"location","label":"Location","sortable":true},{"key":"on_hand","label":"On hand","type":"numeric","sortable":true},{"key":"committed","label":"Committed","type":"numeric"},{"key":"available","label":"Available","type":"numeric"},{"key":"incoming","label":"Incoming","type":"numeric"}]'
    rows='[{"location":"Bengaluru warehouse","on_hand":240,"committed":32,"available":208,"incoming":100},{"location":"Indiranagar store","on_hand":18,"committed":2,"available":16,"incoming":0},{"location":"Koramangala store","on_hand":7,"committed":0,"available":7,"incoming":24}]'></cm-data-table>
</cm-card>` },
      { title: 'Server-rendered table', description: 'In PHP or EJS, write a native `<table>` inside it and it is styled to match. Mark number cells with `data-type="numeric"`. Add `data-sort="text|numeric|money|date"` to a heading to let the merchant sort that column in the browser; give cells a `data-value` when their text is formatted (money, dates). Use `sort-mode="manual"` to sort on the server instead.',
        html: `<cm-data-table>
  <table>
    <caption>Order lines</caption>
    <thead><tr><th scope="col" data-sort="text">Product</th><th scope="col" data-sort="numeric">Quantity</th><th scope="col" data-sort="money">Amount</th></tr></thead>
    <tbody>
      <tr><td>Ceramic mug</td><td data-type="numeric">2</td><td data-type="money" data-value="798">Rs. 798</td></tr>
      <tr><td>Linen apron</td><td data-type="numeric">1</td><td data-type="money" data-value="1250">Rs. 1,250</td></tr>
    </tbody>
    <tfoot><tr><td>Total</td><td data-type="numeric">3</td><td data-type="money">Rs. 2,048</td></tr></tfoot>
  </table>
</cm-data-table>` },
    ],
    states: [
      { title: 'Loading', description: '`loading` shows placeholder rows and marks the table busy; the headings stay.',
        html: `<cm-data-table caption="Sales by day" loading loading-rows="3"
  columns='[{"key":"day","label":"Day"},{"key":"orders","label":"Orders","type":"numeric"},{"key":"sales","label":"Net sales","type":"money"}]'></cm-data-table>` },
      { title: 'Empty', description: 'Put an empty state in the `empty` slot. The totals row is hidden when there are no rows.',
        html: `<cm-data-table caption="Sales by day" rows='[]'
  columns='[{"key":"day","label":"Day"},{"key":"orders","label":"Orders","type":"numeric"},{"key":"sales","label":"Net sales","type":"money"}]'>
  <cm-empty-state slot="empty" size="small" icon="search" heading="No sales in this period">Try a longer date range.</cm-empty-state>
</cm-data-table>` },
    ],
    do: ['Use it for reports and read-only facts: sales by day, stock by location, order lines, tax summaries.', 'Give every table a `caption`; hide it with `caption-hidden` when a heading above already says it.', 'Use `numeric` or `money` for numbers so they line up.', 'With thousands of rows, sort on the server: `sort-mode="manual"`, listen for `cm-sort`, then set `rows`.'],
    dont: ['Don\'t use it for lists merchants select and act on (products, orders, customers): use [[Resource list|/components/resource-list]], which has selection and bulk actions.', 'Don\'t put buttons in every row of a report; link to the object instead.', 'Don\'t make every column sortable: only those merchants scan by.'],
    content: ['Column headings in sentence case, one or two words: "Net sales", not "NET SALES".', 'Write money the same way in every row and in the totals ("Rs. 1,250").', 'Label the totals row "Total".'],
    a11y: ['A native `<table>`: a caption, column headers with `scope="col"` and the first cell of each row as a row header, so screen readers read "Bengaluru warehouse, Available, 208".', 'Sortable headings are buttons inside the column header, which carries `aria-sort`. Every sort is also announced politely ("Sorted by Orders, descending"), because screen readers don\'t reliably read `aria-sort` changes; in `manual` mode the announcement waits until you set `sort` and `direction`.', 'Cell values are always shown as text, never as HTML.', 'A table with a sticky header or first column scrolls in a focusable region named by its caption, so keyboard users can scroll it.', 'While `loading`, the table is `aria-busy` and the placeholders are hidden from screen readers.'],
    related: ['resource-list', 'table-header', 'pagination', 'empty-state'],
  },
  {
    slug: 'resource-list', tag: 'cm-resource-list', react: 'ResourceList', name: 'Resource list', group: 'Lists',
    responsive: ["When the window is 640px wide or less, rows are at least 64px tall with 14px text, an 18px checkbox and 34px thumbnails, and the \"2 orders selected\" status moves onto its own line in the toolbar."],
    parts: [{ tag: 'cm-resource-item', react: 'ResourceItem' }],
    summary: 'Lists products, orders or customers, with bulk selection and actions.',
    lead: 'Rows with a 20px checkbox, an optional 50px thumbnail and 16px text, divided by `border-default` lines. Hovered and selected rows turn `bg-inset`. A selectable list has a toolbar: a Select box with a menu (this page, all matching, none), bulk actions once rows are ticked, "2 products selected" and a link to select every match.',
    examples: [
      { title: 'Selectable, with bulk actions', html: `<cm-resource-list selectable total="15000" resource-name="product">
  <cm-button slot="bulk-actions" size="medium">Bulk orders</cm-button>
  <cm-button slot="actions" size="medium">Customise columns</cm-button>
  <cm-resource-item value="p1" selected>New normal modern classic darkness T-shirt</cm-resource-item>
  <cm-resource-item value="p2" selected>Linen overshirt, sand</cm-resource-item>
  <cm-resource-item value="p3">Canvas tote bag</cm-resource-item>
  <cm-resource-item value="p4">Cotton socks, 3 pairs</cm-resource-item>
</cm-resource-list>` },
      { title: 'With thumbnails and links', html: `<cm-resource-list resource-name="product" style="max-width:520px">
  <cm-resource-item value="p1" href="#/components/resource-list" label="Ceramic mug">
    <cm-thumbnail slot="media" alt=""></cm-thumbnail>
    Ceramic mug<br><small style="color:var(--cm-text-tertiary)">24 in stock</small>
  </cm-resource-item>
  <cm-resource-item value="p2" href="#/components/resource-list" label="Linen napkins">
    <cm-thumbnail slot="media" alt=""></cm-thumbnail>
    Linen napkins<br><small style="color:var(--cm-text-tertiary)">Out of stock</small>
  </cm-resource-item>
</cm-resource-list>` },
      { title: 'With column headings', description: 'A `cm-table-header` in the `header` slot, `--cm-table-columns` on the list and `columns` on each row, one element per column. The list lines the headings up with the cells and leaves room for the checkboxes; the select-all box stays in the toolbar.',
        html: `<cm-resource-list selectable total="128" resource-name="lead" style="--cm-table-columns: 1.6fr 1.4fr 1.8fr 1.2fr 1.1fr 1fr 110px">
  <cm-button slot="bulk-actions" size="medium">Assign owner</cm-button>
  <cm-table-header slot="header" sort="created" direction="descending">
    <option value="name" sortable>Name</option>
    <option value="company">Company</option>
    <option value="email">Email</option>
    <option value="phone">Phone</option>
    <option value="owner">Owner</option>
    <option value="created" sortable>Created</option>
    <option value="status">Status</option>
  </cm-table-header>
  <cm-resource-item value="l1" label="Asha Rao" columns>
    <strong>Asha Rao</strong><span>Rao Textiles</span><span>asha@raotextiles.in</span><span>98450 12345</span><span>Rahul Kumar</span><span>16 Nov</span><span><cm-badge tone="information">New</cm-badge></span>
  </cm-resource-item>
  <cm-resource-item value="l2" label="Ben Cole" columns>
    <strong>Ben Cole</strong><span>Cole &amp; Sons</span><span>ben@coleandsons.com</span><span>99001 55432</span><span>Meera Iyer</span><span>15 Nov</span><span><cm-badge tone="success">Contacted</cm-badge></span>
  </cm-resource-item>
  <cm-resource-item value="l3" label="Divya Menon" columns>
    <strong>Divya Menon</strong><span>Menon Foods</span><span>divya@menonfoods.in</span><span>90080 77881</span><span>Rahul Kumar</span><span>14 Nov</span><span><cm-badge>Qualified</cm-badge></span>
  </cm-resource-item>
</cm-resource-list>` },
      { title: 'Loading', html: `<cm-resource-list loading resource-name="order" style="max-width:520px">
  <cm-resource-item value="o1">#1001 · Asha Rao</cm-resource-item>
  <cm-resource-item value="o2">#1002 · Ben Cole</cm-resource-item>
</cm-resource-list>` },
    ],
    states: [
      { title: 'Empty', description: 'Nothing matches: the `empty` slot replaces the rows. Suggest another search or filter.',
        html: `<cm-resource-list label="Orders" resource-name="order" total="0">
  <cm-empty-state slot="empty" size="small" icon="search" heading="No orders match">Try another status or search.</cm-empty-state>
</cm-resource-list>` },
      { title: 'Error', description: 'The list couldn\'t load: a critical banner in its place, with Try again.',
        html: `<cm-banner tone="critical" heading="Orders couldn't load">
  Check your connection and try again. Your orders are safe.
  <cm-button slot="actions" size="slim">Try again</cm-button>
</cm-banner>` },
    ],
    do: ['Set `resource-name` (and `resource-name-plural` for irregular nouns) so the toolbar reads "2 orders selected".', 'Set `total` to the number of matches so merchants can select all of them, and act on `detail.all` in `cm-selection-change`.', 'Pair it with `cm-status-tabs` above and `cm-pagination` below; put a `cm-table-header` in the `header` slot for columns.', 'With column headings, set `--cm-table-columns` on the list and `columns` on every row, with one element per column (wrap a badge or button in a `<span>`). The list lines the header up with the cells, checkbox column included. Laying a row out yourself works too: a grid on `var(--cm-table-columns)` with `column-gap: var(--cm-space-20)` and `min-width: 0` on the cells.', 'Give each row a `label` when its text is long, so the checkbox and link names stay short.'],
    dont: ['Don\'t put more than one link or many buttons in a row: use the `actions` slot for one or two.', 'Don\'t squeeze many columns onto a phone: at 640px or less, show the row as text (no `columns`, no header), or set a shorter `--cm-table-columns` and leave out the cells and options that don\'t fit.', 'Don\'t set `selectable` on a `cm-table-header` inside a selectable list: the toolbar already has the select-all box. With column headings, put row buttons and thumbnails in a column rather than the `actions` and `media` slots, so the cells stay under their headings.', 'Don\'t use it for settings or navigation: use cards or a nested list.', 'Don\'t show bulk actions that can\'t apply to every selected row.'],
    content: ['Toolbar text: "2 products selected. Select all 15,000 products" and "All 15,000 products selected. Clear selection".', 'Bulk actions are verbs: "Bulk orders", "Archive", "Add tags".'],
    a11y: ['The rows form a list named after the resource ("Products"); each checkbox is named "Select {row name}".', 'The Select box is named "Select all 4 products on this page" and shows a mixed state when some rows are ticked. Its menu button is named "Selection options" and is a standard menu button (↓ opens, arrows move, Esc closes). Hide it with `hide-select-menu`.', 'Selection changes are announced through a polite status message.', 'Linked rows are one link each; the checkbox and actions stay separate tab stops. Clicking a plain row ticks it, but never when clicking a button or link inside.', 'While `loading`, the list is `aria-busy` and the spinner is named "Loading products".', 'Differs from Figma: the toolbar uses our buttons for "Bulk orders" and "Customise columns"; thumbnails are 50px desktop / 34px phone as in Figma, but any image works.'],
    related: ['table-header', 'pagination', 'status-tabs', 'checkbox', 'data-table'],
  },
  {
    slug: 'timeline', tag: 'cm-timeline', react: 'Timeline', name: 'Timeline', group: 'Lists',
    responsive: ['The time moves under the title when the row is too narrow for both; the Show more button lines up with the text on wide screens and with the icons on phones (640px or less).'],
    parts: [{ tag: 'cm-timeline-item', react: 'TimelineItem' }],
    summary: 'The activity on a record: emails, calls, notes, field changes and system events, newest first.',
    lead: 'One row per event: a 32px round icon for its kind, a 14px title with an optional badge, the time at the end of the line ("2 hours ago"; the full date and time on hover and focus), a 12px `text-tertiary` meta line, an optional body clamped to 3 lines with Show all, and optional actions. A 2px `border-default` line joins the icons. "Show more" at the end asks for older events.',
    examples: [
      { title: 'Record activity', description: 'Emails, calls and WhatsApp messages on a lead. The badge names the kind; the action opens the full message. `has-more` adds Show more, which fires `cm-load-more`.',
        html: `<cm-timeline label="Activity for Asha Rao" has-more style="max-width:720px">
  <cm-timeline-item icon="mail" tone="information" heading="Quote for 200 cotton tote bags" datetime="${isoAgo(125)}" meta="by Rahul Kumar · sent">
    <cm-badge slot="badge" tone="information">Email</cm-badge>
    Hi Asha, thanks for your time on the call. As discussed, here is the quote for 200 printed cotton tote bags with your logo on one side. Prices include GST and delivery to Bengaluru. The quote is valid for 30 days; let me know if you would like samples first.
    <cm-button slot="actions" size="slim" href="#/components/timeline">Read email</cm-button>
  </cm-timeline-item>
  <cm-timeline-item icon="mail" heading="Email opened" datetime="${isoAgo(95)}" meta="by Asha Rao · 2 times"></cm-timeline-item>
  <cm-timeline-item icon="chat" tone="success" heading="Call: discussed bulk pricing" datetime="${isoAgo(60 * 26)}" meta="by Rahul Kumar · outgoing · 12 min">
    <cm-badge slot="badge" tone="success">Call</cm-badge>
    Asha needs 200 bags by 5 December for a store opening. Wants a quote with printing on one side.
  </cm-timeline-item>
  <cm-timeline-item icon="send" heading="WhatsApp message delivered" datetime="${isoAgo(60 * 50)}" meta="by Rahul Kumar · template: Introduction">
    <cm-badge slot="badge">WhatsApp</cm-badge>
  </cm-timeline-item>
</cm-timeline>` },
      { title: 'Notes', description: 'Long notes are clamped to `lines` lines (3 by default) with Show all. Put the author in the meta line.',
        html: `<cm-timeline label="Notes" style="max-width:560px">
  <cm-timeline-item icon="note" heading="Note" datetime="${isoAgo(40)}" meta="by Meera Iyer" lines="2">
    Visited the Indiranagar store. They stock our mugs on the front shelf and sold out of the blue glaze last week. The owner wants to try the linen napkins next month and asked for a display stand. Follow up after Diwali with a sample set and the wholesale price list.
  </cm-timeline-item>
  <cm-timeline-item icon="note" heading="Note" datetime="${isoAgo(60 * 24 * 3)}" meta="by Rahul Kumar">Prefers calls after 4 pm.</cm-timeline-item>
</cm-timeline>` },
      { title: 'System events and field changes', description: 'Changes made by people, automations and imports. Write a field change as "Field: old → new" in the title; no body is needed.',
        html: `<cm-timeline label="History" style="max-width:560px">
  <cm-timeline-item icon="edit" heading="Status: New → Contacted" datetime="${isoAgo(15)}" meta="by Rahul Kumar"></cm-timeline-item>
  <cm-timeline-item icon="user" heading="Owner: Meera Iyer → Rahul Kumar" datetime="${isoAgo(60 * 5)}" meta="by assignment rule · Round robin, Bengaluru"></cm-timeline-item>
  <cm-timeline-item icon="tag" heading="Tag added: Wholesale" datetime="${isoAgo(60 * 5 + 2)}" meta="by Meera Iyer"></cm-timeline-item>
  <cm-timeline-item icon="plus" heading="Lead created" datetime="2026-11-02T09:30:00+05:30" meta="by Website form · Contact us">
    <cm-badge slot="badge">System</cm-badge>
  </cm-timeline-item>
</cm-timeline>` },
    ],
    states: [
      { title: 'Loading', description: '`loading` with no items yet shows placeholder rows and announces "Loading activity".',
        html: `<cm-timeline loading style="max-width:560px"></cm-timeline>` },
      { title: 'Loading more', description: 'After `cm-load-more`, set `loading` while the next page loads: Show more shows a spinner and can\'t be pressed twice. Append the items, then clear `loading`, and `has-more` on the last page.',
        html: `<cm-timeline has-more loading style="max-width:560px">
  <cm-timeline-item icon="edit" heading="Status: Contacted → Qualified" datetime="${isoAgo(60 * 24 * 2)}" meta="by Rahul Kumar"></cm-timeline-item>
</cm-timeline>` },
      { title: 'Empty', description: 'Put a `cm-empty-state` in the `empty` slot. It shows when there are no items and nothing is loading.',
        html: `<cm-timeline style="max-width:560px">
  <cm-empty-state slot="empty" size="small" icon="clock" heading="No activity yet">Emails, calls and notes for this lead will show here.</cm-empty-state>
</cm-timeline>` },
    ],
    do: ['Show the newest event first, and page older ones with `has-more` and `cm-load-more`.', 'Give `datetime` as an ISO date-time with its offset, so the relative time, the full time and `<time datetime>` are right.', 'Pick one icon per kind and keep it: `mail` for emails, `chat` for calls, `note` for notes, `edit` for field changes, `user` for owner changes.', 'Name the kind in the title or a badge too: the icon is decoration and is not read out.', 'Filter by kind with `cm-status-tabs` above the timeline, with a count on each tab.', 'Set `label` when there is more than one timeline on the page, e.g. "Notes" and "History".'],
    dont: ['Don\'t put long forms or several buttons in an item: one or two actions, such as "Read email" or "Open task".', 'Don\'t use it for comments people write together on an order: use [[Comment|/components/comment]].', 'Don\'t show the whole body of every email: let it clamp, and link to the full message.'],
    content: ['Titles say what happened, briefly: "Email sent", "Call: discussed bulk pricing", "Status: New → Contacted".', 'Meta line: who, then details, joined with " · ": "by Rahul Kumar · sent".', 'Badges are one word for the kind: Email, Call, WhatsApp, Note, System.'],
    a11y: ['An ordered list (`<ol>`, named "Activity" or `label`) with one `<li>` per event; the line between icons is decoration.', 'Each time is a `<time datetime>`. Screen readers hear the relative time and then the full date and time ("2 hours ago, Monday, 16 November 2026 at 10:30"). The time is a Tab stop so keyboard users can see the full date in its tooltip.', 'Show all / Show less is a button with `aria-expanded`, controlling the body. The clamped text is still read in full by screen readers.', 'Show more is a button; while `loading` it is busy and "Loading activity" is announced. When the last page arrives and the button goes away, focus moves to the list.', 'Screen readers read "→" as "right arrow" or "to", depending on the reader.'],
    related: ['comment', 'status-tabs', 'badge', 'empty-state'],
  },
  {
    slug: 'nested-list', tag: 'cm-nested-list', react: 'NestedList', name: 'Nested list', group: 'Lists',
    responsive: ["When the window is 640px wide or less, rows are at least 50px tall instead of 60px, with 14px text; child rows are indented 20px instead of 50px, and the list header is at least 60px tall with an 18px title."],
    parts: [{ tag: 'cm-nested-item', react: 'NestedItem' }],
    summary: 'Rows that nest inside each other, such as menu links or sub-categories, with reordering.',
    lead: 'A 90px grey bar with a 26px title and actions, then 60px bordered rows indented 50px per level. With `sortable`, each row starts with a drag handle; with `collapsible`, a round black button shows and hides the rows.',
    examples: [
      { title: 'Categories, sortable', html: `<cm-nested-list heading="Clothing & accessories" sortable>
  <cm-toggle slot="actions" checked aria-label="Show Clothing & accessories"></cm-toggle>
  <cm-nested-item label="Footwear and shoes"><cm-toggle slot="actions" aria-label="Show Footwear and shoes"></cm-toggle></cm-nested-item>
  <cm-nested-item label="Games & toys"><cm-toggle slot="actions" aria-label="Show Games & toys"></cm-toggle></cm-nested-item>
  <cm-nested-item label="Pet items">
    <cm-toggle slot="actions" checked aria-label="Show Pet items"></cm-toggle>
    <cm-nested-item label="Accessories"><cm-toggle slot="actions" checked aria-label="Show Accessories"></cm-toggle></cm-nested-item>
    <cm-nested-item label="Exclusive items">
      <cm-toggle slot="actions" checked aria-label="Show Exclusive items"></cm-toggle>
      <cm-nested-item label="Limited editions"><cm-toggle slot="actions" checked aria-label="Show Limited editions"></cm-toggle></cm-nested-item>
    </cm-nested-item>
  </cm-nested-item>
</cm-nested-list>` },
      { title: 'Navigation menu, collapsible', html: `<cm-nested-list heading="Header" collapsible sortable>
  <cm-button slot="actions" variant="primary" size="large">Add links</cm-button>
  <cm-nested-item label="Home">
    <cm-badge slot="actions" tone="success">Accepted</cm-badge>
    <cm-button slot="actions" size="slim">Edit</cm-button>
    <cm-button slot="actions" size="slim">Delete</cm-button>
  </cm-nested-item>
</cm-nested-list>` },
    ],
    do: ['Listen for `cm-reorder` to save the new order; call `preventDefault()` to refuse a move.', 'Give icon-only controls in a row a name that includes the row: "Edit Home", "Delete Home".', 'Keep nesting to three levels or fewer.'],
    dont: ['Don\'t use it for long lists of products or orders: use a resource list.', 'Don\'t rely on drag and drop alone to explain reordering: the handles also move with ↑/↓.'],
    content: ['Row labels are the names merchants gave the links or categories.', 'Heading is the menu or parent category name.'],
    a11y: ['The rows are nested lists (`list`/`listitem`), so screen readers announce the level and position.', 'Drag handles are buttons named "Reorder {label}": ↑/↓ move the row among its siblings, Home/End to the ends. The new position is announced.', 'Rows only move among their siblings; to change a row\'s parent, edit it.', 'The collapse button has `aria-expanded` and is named "Hide {heading}" / "Show {heading}".', 'Differs from Figma: the heading is 26px medium as in Figma but scales to 18px on phones; drag handles use our `drag` icon (Figma\'s is a PNG); row actions come from your own components (toggle, buttons, badge).'],
    related: ['accordion', 'toggle', 'resource-list'],
  },
  {
    slug: 'report-tile', tag: 'cm-report-tiles', react: 'ReportTiles', name: 'Report tile', group: 'Lists',
    responsive: ["When the window is wider than 640px, tiles are 146px wide and each row holds as many as fit.", "At 640px or less, each row holds exactly three tiles, which share the width; tiles are 118px tall with 38px icons."],
    parts: [{ tag: 'cm-report-tile', react: 'ReportTile' }],
    summary: 'Square tiles that open reports, grouped under a title such as "Sales".',
    lead: '146 × 150px tiles with a `border-default` edge, a 58px icon and a 14px medium name, 15px apart. Pinned tiles show a pin in the corner. On phones tiles are 118px high, three to a row, with a 38px icon.',
    examples: [
      { title: 'Sales reports', html: `<cm-report-tiles heading="Sales">
  <cm-report-tile label="Hourly sales" icon="clock" href="#/components/report-tile"></cm-report-tile>
  <cm-report-tile label="Daily sales" icon="calendar" href="#/components/report-tile"></cm-report-tile>
  <cm-report-tile label="Monthly sales" icon="chart" href="#/components/report-tile" pinned></cm-report-tile>
  <cm-report-tile label="Sales by product" icon="box" href="#/components/report-tile"></cm-report-tile>
  <cm-report-tile label="Sales by payment" icon="cart" href="#/components/report-tile"></cm-report-tile>
  <cm-report-tile label="Customers" icon="users" href="#/components/report-tile"></cm-report-tile>
</cm-report-tiles>` },
    ],
    do: ['Group tiles by subject ("Sales", "Customers", "Inventory") with one `cm-report-tiles` each.', 'Use `href` so tiles open in a new tab with a middle click.', 'Pin the reports merchants use most; pinned tiles also appear on the dashboard.'],
    dont: ['Don\'t put numbers or charts in a tile: tiles only open reports. To show a total, use a [[Metric|/components/metric]].', 'Don\'t use long names that wrap to three lines.'],
    content: ['Names are two or three words in sentence case: "Hourly sales", "Sales by payment".', 'Group titles are one word where possible: "Sales".'],
    a11y: ['Tiles form a list named by the group heading; each tile is one link (or button) named by its label.', 'A pinned tile adds ", pinned" to its name; the pin icon itself is hidden.', 'Icons are decorative and hidden from screen readers.', 'Differs from Figma: Figma\'s report icons and pin are PNG illustrations, so tiles use our line icons (`clock`, `calendar`, `chart`, …); pass your own artwork in the `icon` slot. Tiles stretch to fill the row on phones instead of a fixed 118px.'],
    related: ['card', 'smart-tip', 'nested-list'],
  },
  {
    slug: 'metric', tag: 'cm-metric', react: 'Metric', name: 'Metric', group: 'Lists',
    responsive: ['Fills the width it is given; put a row of metrics in a `cm-grid` with `min-column-width`, which drops to fewer columns, and to one on phones, as the space shrinks.', 'When the window is 640px wide or less, the tile padding is 15px instead of 20px and the figure is 24px instead of 26px. Long figures and labels wrap instead of overflowing.', 'In a grid row, every metric stretches to the height of the tallest, so tiles with and without a hint line up.'],
    summary: 'One number with its name, such as a report total or KPI, optionally linking to the list behind it.',
    lead: 'A card-like tile: a 14px label, a 26px figure in tabular numerals (`type-heading-lg`), then an optional change ("+12%" with an arrow) and a quieter hint line. A number in `value` is formatted for the page language ("1,240"; lakh grouping "12,40,000" in `en-IN`); any other text is shown as given. With `href` the whole tile is one link. For a row of totals use [[Grid|/components/grid]]: there is no separate container.',
    examples: [
      { title: 'Report totals with hints', description: 'The CRM Reports row: each total opens its list. `cm-grid min-column-width` fits as many tiles as there is room for; resize the example to see the row wrap.',
        html: `<cm-grid min-column-width="200px" gap="15" lang="en-IN">
  <cm-metric label="SMB leads" value="1240" href="#/components/metric"></cm-metric>
  <cm-metric label="Enterprise leads" value="86" href="#/components/metric"></cm-metric>
  <cm-metric label="Demos in the next 7 days" value="3" hint="2 past demos need a result" href="#/components/metric"></cm-metric>
  <cm-metric label="Pipeline value" value="Rs. 12,40,000" hint="Open deals only" href="#/components/metric"></cm-metric>
</cm-grid>` },
      { title: 'With a change', description: '`change` is the text to show, `trend` its direction. Up is good news and down bad by default; set `trend-sentiment="negative"` when a rise is bad (more overdue tasks, more refunds) or `positive` when a fall is good. The arrow and the words read to screen readers carry the meaning, not only the colour.',
        html: `<cm-grid min-column-width="200px" gap="15" lang="en-IN">
  <cm-metric label="Won deals" value="48" change="+12%" trend="up" hint="vs last month"></cm-metric>
  <cm-metric label="New leads" value="1240" change="-5%" trend="down" hint="vs last month"></cm-metric>
  <cm-metric label="Overdue tasks" value="9" change="+3" trend="up" trend-sentiment="negative" hint="since yesterday"></cm-metric>
  <cm-metric label="Average reply time" value="2 h" change="0%" trend="flat" hint="vs last week"></cm-metric>
</cm-grid>` },
      { title: 'Loading', description: 'While the totals are fetched, set `loading`: a placeholder takes the figure\'s place, the tile is `aria-busy` and "Loading <label>" is announced politely. Keep the label visible so the row doesn\'t jump.',
        html: `<cm-grid min-column-width="200px" gap="15">
  <cm-metric label="SMB leads" loading href="#/components/metric"></cm-metric>
  <cm-metric label="Demos in the next 7 days" loading href="#/components/metric"></cm-metric>
  <cm-metric label="Pipeline value" loading href="#/components/metric"></cm-metric>
</cm-grid>` },
      { title: 'A single metric', description: 'A hint with markup goes in the `hint` slot. Without `href` the tile is plain text: nothing to focus.',
        html: `<cm-metric label="Tickets waiting" value="17" style="max-width:260px">
  <span slot="hint"><strong>4</strong> older than a day</span>
</cm-metric>` },
    ],
    do: ['Pass numbers as numbers (`value="1240"`, or `value={1240}` in React) so they are grouped for the page language; pass text only when it is already formatted, such as money with a currency ("Rs. 12,40,000").', 'Link each total to the list behind it with `href`, filtered to the same records the number counts.', 'Put a row of metrics in `cm-grid` with `min-column-width` (about 200px) so it wraps on narrow screens.', 'Say what the change compares with in the hint: "vs last month".', 'Set `trend-sentiment` whenever up is not good news.'],
    dont: ['Don\'t use it to open a report that has no single number: use a [[Report tile|/components/report-tile]].', 'Don\'t rely on colour for good or bad: always set `trend`, so there is an arrow and the direction is read out.', 'Don\'t put buttons or other links inside a linked metric: the whole tile is one link.', 'Don\'t show more than one figure in a tile: split it into two metrics.'],
    content: ['Labels name what is counted, in two to four words and sentence case: "SMB leads", "Demos in the next 7 days".', 'Hints are one short line, no full stop: "2 past demos need a result".', 'Write the change as it should read, with its sign: "+12%", "-3".'],
    a11y: ['With `href` the tile is a single link whose accessible name is the label and the figure ("SMB leads 1,240"); the change and hint are its description. Without `href` nothing in it takes focus.', 'The change arrow is decorative; screen readers hear the direction and whether it is good news in words ("Up +12%, good"). Wording is in the `metric` strings (`up`, `down`, `flat`, `good`, `bad`).', 'While `loading`, the figure is replaced by a hidden placeholder, the tile has `aria-busy="true"` and "Loading <label>" is announced through a polite status region (key `loadingValue`).', 'Colours meet WCAG AA on `bg-surface` in light and dark: label and figure `text-default`, hint and flat change `text-tertiary`, good `text-success`, bad `text-critical`. These pairs are in the token contrast check.', 'Arrows follow the reading direction: in right-to-left text up points up-left and down points down-left.', 'Differs from the CRM workaround: the figure is 26px (`type-heading-lg`), not 32px, so it uses a type token; there is no Figma design for this tile yet.'],
    related: ['grid', 'report-tile', 'card'],
  },
  {
    slug: 'app-frame', tag: 'cm-app-frame', react: 'AppFrame', name: 'App frame', group: 'Navigation', adminOnly: true,
    responsive: ['Follows the frame\'s own width (normally the window\'s): at 1024px and wider the side navigation sits on the start side under the header; narrower, the side navigation is hidden and the bottom navigation is fixed to the bottom of the window, with the page padded so nothing hides behind it.', 'The header sticks to the top, below the device\'s notch or status bar (`env(safe-area-inset-top)`). The side navigation sticks under the header and scrolls on its own when it is taller than the window. The page scrolls with the window.', 'The mobile menu, while `menu-open` is set and the frame is narrower than 1024px, covers the window above the page and header and below the bottom navigation.'],
    summary: 'The admin\'s frame: header bar, side or bottom navigation, mobile menu and the page, in their places.',
    lead: 'One element that puts the parts of the admin together: the Header bar across the top, the Side navigation down the start side, the page next to it, and on phones and small tablets the Bottom navigation with the Mobile menu instead. Every Commmerce product gets the same grid without writing its own CSS. See [[Admin frame|/patterns/admin-frame]] for the whole thing at desktop and phone widths.',
    examples: [
      { title: 'Phone: bottom navigation and menu', description: 'The preview is narrower than 1024px, so it shows the phone layout. Press More to open the Mobile menu, and again (or Esc) to close it. The two outer divs only keep the example in its box: in your app, `cm-app-frame` is the top element of the page. The desktop layout is on the [[Admin frame|/patterns/admin-frame]] page.',
        html: `<div style="height:560px;transform:translateZ(0);overflow:hidden;border-radius:12px;--cm-app-frame-height:560px">
<div style="height:100%;overflow:auto">
<cm-app-frame menu-item="more">
  <cm-header-bar slot="header" store="preprod.commmerce.com" user-name="Demo user">
    <img slot="logo" src="vendor/brand/wordmark-black.svg" alt="Commmerce" width="190" height="14">
  </cm-header-bar>
  <cm-side-navigation slot="navigation" collapsible>
    <cm-nav-item label="Dashboard" icon="home" href="#/components/app-frame"></cm-nav-item>
    <cm-nav-item label="Orders" icon="bag" href="#/components/app-frame" current badge="12"></cm-nav-item>
    <cm-nav-item label="Products" icon="box" href="#/components/app-frame"></cm-nav-item>
  </cm-side-navigation>
  <cm-page>
    <cm-page-header slot="header" heading="Orders"></cm-page-header>
    <cm-card heading="Today">12 orders · Rs. 18,400</cm-card>
  </cm-page>
  <cm-bottom-navigation slot="bottom-navigation">
    <cm-nav-item label="Home" icon="home" href="#/components/app-frame"></cm-nav-item>
    <cm-nav-item label="Orders" icon="bag" href="#/components/app-frame" current></cm-nav-item>
    <cm-nav-item label="Quick add" icon="plus" primary></cm-nav-item>
    <cm-nav-item label="Products" icon="box" href="#/components/app-frame"></cm-nav-item>
    <cm-nav-item label="More" icon="more" value="more"></cm-nav-item>
  </cm-bottom-navigation>
  <cm-mobile-menu slot="mobile-menu" store="preprod.commmerce.com" user-name="Demo user">
    <cm-nav-item label="Panels">
      <cm-nav-item label="Customers" icon="users" href="#/components/app-frame"></cm-nav-item>
      <cm-nav-item label="Reports" icon="chart" href="#/components/app-frame"></cm-nav-item>
      <cm-nav-item label="Settings" icon="settings" href="#/components/app-frame"></cm-nav-item>
    </cm-nav-item>
  </cm-mobile-menu>
</cm-app-frame>
</div>
</div>` },
    ],
    do: ['Make it the top element of every page of a Commmerce product, with the same navigation items on every page.', 'Set `menu-item="more"` and give the bottom navigation\'s More item `value="more"`, unless you need to open the menu yourself.', 'Remember the merchant\'s collapsed side navigation: listen for `cm-collapse` and set `collapsed` from what you stored.'],
    dont: ['Don\'t use it inside an app: the admin already draws this frame around apps.', 'Don\'t put another `main`, `header` or `nav` around its parts: the frame and the parts bring their own landmarks.', 'Don\'t set `fixed` on the bottom navigation or position the parts yourself: the frame does it.'],
    content: ['The frame has no text of its own. Words come from the parts.'],
    a11y: ['Adds one landmark, `main`, around the page. The header bar is the `banner` and each navigation is a `nav`; only the one that fits the width is shown, so screen readers find a single main menu.', 'While the mobile menu is open, the header and page behind it are inert, so Tab and screen readers stay in the menu and the bottom navigation.', 'With `menu-item`, opening the menu moves focus to its first row; Esc or More closes it and focus goes back to More. Choosing a row closes it.', 'Logical CSS: in right-to-left languages the side navigation is on the right.', 'The bottom navigation\'s More button does not say whether the menu is open (no `aria-expanded`): it is a navigation item, like the other tabs.'],
    related: ['side-navigation', 'header-bar', 'bottom-navigation', 'mobile-menu', 'page'],
  },
  {
    slug: 'side-navigation', tag: 'cm-side-navigation', react: 'SideNavigation', name: 'Side navigation', group: 'Navigation', adminOnly: true,
    parts: [{ tag: 'cm-nav-item', react: 'NavItemElement' }],
    summary: 'The admin\'s main menu down the left of the page, with sections that open.',
    lead: 'A black panel with 16px corners, inset 20px from the page edges. Each 40px row has a 20px line icon and a 16px label; sections end in a chevron and open to show their sub-items. The current page is white and bold, the rest light grey. Items come from `cm-nav-item` children or a JSON `items` property, so every Commmerce product can fill it with its own destinations.',
    examples: [
      { title: 'Commmerce admin', description: 'The items of the live admin. A section that holds the current page opens on its own.',
        html: `<cm-side-navigation>
  <cm-nav-item label="Dashboard" icon="home" href="#dashboard" current></cm-nav-item>
  <cm-nav-item label="Catalog" icon="box">
    <cm-nav-item label="Products" href="#products"></cm-nav-item>
    <cm-nav-item label="Categories" href="#categories"></cm-nav-item>
    <cm-nav-item label="Inventory" href="#inventory"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Orders" icon="bag">
    <cm-nav-item label="All orders" href="#orders"></cm-nav-item>
    <cm-nav-item label="Abandoned carts" href="#abandoned"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="WebPOS" icon="pos" href="#webpos"></cm-nav-item>
  <cm-nav-item label="Customers" icon="users">
    <cm-nav-item label="All customers" href="#customers"></cm-nav-item>
    <cm-nav-item label="Customer groups" href="#customer-groups"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Subscriptions" icon="repeat" href="#subscriptions"></cm-nav-item>
  <cm-nav-item label="Website" icon="website">
    <cm-nav-item label="Themes" href="#themes"></cm-nav-item>
    <cm-nav-item label="Pages" href="#pages"></cm-nav-item>
    <cm-nav-item label="Menus" href="#menus"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Apps" icon="apps" href="#apps"></cm-nav-item>
  <cm-nav-item label="Reports" icon="chart" href="#reports"></cm-nav-item>
  <cm-nav-item label="Marketing" icon="megaphone">
    <cm-nav-item label="Discounts" href="#discounts"></cm-nav-item>
    <cm-nav-item label="Campaigns" href="#campaigns"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Staff Management" icon="staff">
    <cm-nav-item label="Staff" href="#staff"></cm-nav-item>
    <cm-nav-item label="Roles" href="#roles"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Settings" icon="settings">
    <cm-nav-item label="Store details" href="#store"></cm-nav-item>
    <cm-nav-item label="Payments" href="#payments"></cm-nav-item>
    <cm-nav-item label="Shipping" href="#shipping"></cm-nav-item>
  </cm-nav-item>
</cm-side-navigation>` },
      { title: 'Inside a sub-section', description: 'Mark the sub-item as `current`; its section opens and its label turns white.',
        html: `<cm-side-navigation>
  <cm-nav-item label="Dashboard" icon="home" href="#dashboard"></cm-nav-item>
  <cm-nav-item label="Orders" icon="bag">
    <cm-nav-item label="All orders" href="#orders" current></cm-nav-item>
    <cm-nav-item label="Abandoned carts" href="#abandoned"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Apps" icon="apps" href="#apps" badge="New"></cm-nav-item>
</cm-side-navigation>` },
      { title: 'Collapsed to icons', description: '`collapsed` shows a 72px rail. Hover or focus an item to see its label; a numeric badge stays as a small count, any other badge as a dot. `collapsible` adds the button at the bottom, which fires `cm-collapse` so your app can remember the choice. Choosing a section in the rail expands the menu and opens the section.',
        html: `<cm-side-navigation collapsed collapsible>
  <cm-nav-item label="Dashboard" icon="home" href="#dashboard"></cm-nav-item>
  <cm-nav-item label="Orders" icon="bag" href="#orders" current badge="12"></cm-nav-item>
  <cm-nav-item label="Customers" icon="users" href="#customers"></cm-nav-item>
  <cm-nav-item label="Apps" icon="apps" href="#apps" badge="New"></cm-nav-item>
  <cm-nav-item label="Settings" icon="settings">
    <cm-nav-item label="Store details" href="#store"></cm-nav-item>
    <cm-nav-item label="Payments" href="#payments"></cm-nav-item>
  </cm-nav-item>
</cm-side-navigation>` },
    ],
    do: ['Use one side navigation per product, on every page, with the same items in the same order.', 'Mark exactly one item `current`.', 'Use the `cm-navigate` event (and `preventDefault()`) when your app routes on the client.', 'Below 1024px, hide it and show a Bottom navigation with a Mobile menu instead. The [[App frame|/components/app-frame]] does this for you.', 'To let merchants collapse it, add `collapsible` (or your own button that sets `collapsed`), listen for `cm-collapse` and store the choice, so the menu stays collapsed on the next page.', 'Give every item an icon if the menu can be collapsed: without one, the rail shows the label\'s first letter.'],
    dont: ['Don\'t use it inside an app: apps run inside the admin, which already has this menu.', 'Don\'t nest more than one level: deeper items are listed under their section, indented.', 'Don\'t put actions ("Add product") in the menu: it only goes to places.'],
    content: ['One or two words per item, naming a place: "Orders", "Staff Management".', 'Keep the order merchants know: Dashboard first, Settings last.'],
    a11y: ['A `nav` landmark named "Main" (set `label` to change it). Items are links; the current one has `aria-current="page"`.', 'Sections are buttons with `aria-expanded` and `aria-controls`. Enter or Space opens and closes them; → opens, ← closes or goes back to the section from a sub-item.', '↑/↓ move between visible items, Home/End jump to the first and last. Tab still moves through every item.', 'Collapsed: each item keeps its label as its accessible name (visually hidden, with the badge in brackets) and shows it in a tooltip on hover and keyboard focus. The tooltip only repeats the name, so it is not added as a description. Sub-items are hidden; a section is a button that expands the menu and opens it. ← and → do nothing in the rail. The built-in button is named "Collapse menu" or "Expand menu" (translatable: `collapse`, `expand`).', 'Unselected items use the new `text-on-dark-secondary` token (#B5B5B5, 10:1 on black, AA on the hover fill); icons are decorative.', 'Differs from the live admin screenshot: icons are our line icons (the admin uses filled glyphs); new icons drawn for this: `pos`, `repeat`, `website`, `apps`, `megaphone`, `staff`. The source of truth is the admin screenshot, not the older Figma "Dashboard" page.'],
    related: ['app-frame', 'header-bar', 'bottom-navigation', 'mobile-menu', 'tooltip'],
  },
  {
    slug: 'header-bar', tag: 'cm-header-bar', react: 'HeaderBar', name: 'Header bar', group: 'Navigation', adminOnly: true,
    responsive: ["Follows the bar's own width, not the window: at 900px or narrower the `actions` slot is hidden and the `search` slot moves behind a search button that opens it full screen; at 640px or narrower the wallet balance is hidden too, the user pill shrinks to the avatar (the name is still read by screen readers) and the bar is 56px tall. The store name also gets smaller at 1100px and 640px."],
    summary: 'The white bar across the top of the admin: logo, store switcher, account actions and the user.',
    lead: 'A 70px white bar. The logo sits on the left, then the store switcher (18px, with a chevron). On the right: your action buttons, the wallet balance in an outlined 44px pill and the user in a 50px rounded pill with a round avatar. It fits its own width: under 900px the action buttons hide, and under 640px only the logo, the store and the avatar remain (put the rest in the Mobile menu). A product-wide search goes in the `search` slot: inline after the store switcher on wide bars, and behind a search button that opens it full screen at 900px or narrower.',
    examples: [
      { title: 'Commmerce admin', html: `<cm-header-bar store="preprod.commmerce.com" balance="₹ 2,312" user-name="Demo user">
  <img slot="logo" src="vendor/brand/wordmark-black.svg" alt="Commmerce" width="190" height="14">
  <cm-button slot="actions" size="large">Hire an Expert</cm-button>
  <cm-button slot="actions" variant="primary" size="large">My Subscription</cm-button>
</cm-header-bar>` },
      { title: 'With global search', description: 'Put a [[Global search|/components/global-search]] in the `search` slot. This preview is narrower than 900px, so the bar shows the search button: press it to open the search full screen (Escape, the close button or choosing a result closes it). In a full-width admin the box sits inline after the store switcher.',
        html: `<cm-header-bar store="preprod.commmerce.com" user-name="Demo user">
  <img slot="logo" src="vendor/brand/mark-black.svg" alt="Commmerce" width="24" height="24">
  <cm-global-search slot="search" label="Search the CRM" placeholder="Search leads, deals, contacts" shortcut="/"
    results='[{"label": "Leads", "items": [{"title": "Ravi Stores", "description": "Lead · Mumbai", "href": "#lead-ravi-stores"}]}]'></cm-global-search>
</cm-header-bar>` },
      { title: 'Logo and user only', description: 'Products without stores or a wallet leave those attributes out.',
        html: `<cm-header-bar user-name="Asha Rao">
  <img slot="logo" src="vendor/brand/wordmark-black.svg" alt="Commmerce" width="190" height="14">
</cm-header-bar>` },
      { title: 'Notifications bell', description: 'Put an icon-only Button in the `end` slot with the unread count, and open the Notification panel when it is pressed (here with `data-opens`; in your product, call the panel\'s `show()` in a click listener). Keep `count` in step with the unread items. The bar has no notifications API of its own: the button and the panel are yours to wire.',
        html: `<cm-header-bar user-name="Asha Rao">
  <img slot="logo" src="vendor/brand/wordmark-black.svg" alt="Commmerce" width="190" height="14">
  <cm-button slot="end" icon-only icon="bell" label="Notifications" count="2" size="large" data-opens="header-notes"></cm-button>
</cm-header-bar>
<cm-notification-panel id="header-notes" more-href="#notifications">
  <cm-notification-item time="1 min ago" href="#order-1042" unread>New order received</cm-notification-item>
  <cm-notification-item time="12 mins ago" tone="attention" href="#stock" unread>Product low stock</cm-notification-item>
  <cm-notification-item time="1 hr ago" tone="success" href="#order-1041">Payment received</cm-notification-item>
</cm-notification-panel>` },
    ],
    do: ['Show it on every admin page, above the Side navigation.', 'Put one product-wide search in the `search` slot, not in `actions` (actions hide on narrow bars; the search slot collapses to a button instead).', 'Keep to two action buttons, with at most one primary.', 'Open a store list on `cm-store-switch` and an account menu on `cm-account` (menus arrive with batch 4).'],
    dont: ['Don\'t use it inside an app: the admin already shows it above the app.', 'Don\'t put page actions ("Save", "Add product") here; they belong in the Page header.', 'Don\'t format the balance in the component: pass the text the merchant should see.'],
    content: ['Show the store\'s address or name exactly as the merchant set it.', 'Buttons are short and in title case as in the live admin: "Hire an Expert", "My Subscription".'],
    a11y: ['A `banner` landmark. The store switcher, balance and user pill are buttons named "Store: … Switch store", "Wallet balance …" and "Account: …", which include their visible text.', 'On narrow bars the search button is named "Search" (`search-label`) with `aria-haspopup="dialog"` and `aria-expanded`. It opens a full-screen modal `<dialog>` with the same name: focus moves into the search box, the page behind is inert and does not scroll, Escape (once the results are closed) or the close button closes it, and focus returns to the button.', 'The store and user buttons say they open a menu (`aria-haspopup`).', 'The logo needs its own `alt` text ("Commmerce").', 'Differs from the live admin screenshot: the avatar is a person line icon on `bg-input-filled` when there is no photo; the logo is the vector wordmark without ™ (a vector ™ version must come from the source artwork); the 18px store text shrinks to 16px when the bar is under 1100px wide.'],
    related: ['side-navigation', 'mobile-menu', 'button'],
  },
  {
    slug: 'bottom-navigation', tag: 'cm-bottom-navigation', react: 'BottomNavigation', name: 'Bottom navigation', group: 'Navigation', adminOnly: true,
    summary: 'The admin\'s tab bar on phones: five destinations along the bottom of the screen.',
    lead: 'A white bar with 16px top corners and a soft shadow. Each item is a 24px line icon over an uppercase label. The current item is black, the others grey; the main action (`primary`, Quick add) is a black square with a white plus. The last item, "More", opens the Mobile menu.',
    examples: [
      { title: 'Commmerce admin on a phone', html: `<div style="max-width:414px">
<cm-bottom-navigation>
  <cm-nav-item label="Home" icon="home" href="#home" current></cm-nav-item>
  <cm-nav-item label="Products" icon="box" href="#products"></cm-nav-item>
  <cm-nav-item label="Quick add" icon="plus" primary></cm-nav-item>
  <cm-nav-item label="Orders" icon="bag" href="#orders"></cm-nav-item>
  <cm-nav-item label="More" icon="more" value="more"></cm-nav-item>
</cm-bottom-navigation>
</div>` },
    ],
    do: ['Show it below 1024px instead of the Side navigation, pinned with `fixed`, or put it in the [[App frame|/components/app-frame]]\'s `bottom-navigation` slot, which pins it and pads the page for you.', 'Keep to five items; the fifth is "More" and opens the Mobile menu (listen for `cm-navigate` with `value` "more").', 'Leave space at the bottom of the page so the bar never covers content.'],
    dont: ['Don\'t use it inside an app.', 'Don\'t mark more than one item `primary`.', 'Don\'t use labels longer than one word: they are truncated.'],
    content: ['One word per item: "Home", "Products", "Orders", "More". The labels are shown in capitals by CSS; write them in sentence case.'],
    a11y: ['A `nav` landmark named "Main". Items are links (current one with `aria-current="page"`) or buttons for actions such as Quick add and More.', 'Targets are at least 48px tall and a fifth of the width.', 'Differs from Figma: labels are 10px instead of 8px for legibility; unselected items are `text-tertiary` grey (Figma shows the selected state only); Figma\'s PNG icons are our line icons. With `fixed`, the bar pads for the device\'s home indicator.'],
    related: ['app-frame', 'mobile-menu', 'side-navigation'],
  },
  {
    slug: 'mobile-menu', tag: 'cm-mobile-menu', react: 'MobileMenu', name: 'Mobile menu', group: 'Navigation', adminOnly: true,
    summary: 'The admin\'s full menu on phones, opened from "More": store, user and every section.',
    lead: 'A grey page of white cards with 12px corners. The Profile card shows the store ("Logged in to store") and the signed-in user. Then come labelled sections (12px capitals) of 18px rows with a grey 24px icon and a chevron. Rows with sub-items open them on a second screen with a back arrow. A section can end with a centred action such as "Add channel".',
    examples: [
      { title: 'Commmerce admin', html: `<div style="max-width:414px">
<cm-mobile-menu store="Obiroye Garments Zix" user-name="Robinson Jain" user-email="robinson@example.com">
  <cm-nav-item label="Channels">
    <cm-nav-item label="Online Store" icon="store" href="#online-store"></cm-nav-item>
    <cm-nav-item label="Point of sale" icon="pos" href="#pos"></cm-nav-item>
    <cm-nav-item label="ONDC" icon="globe" href="#ondc"></cm-nav-item>
    <cm-nav-item label="Add channel" primary value="add-channel"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Panels">
    <cm-nav-item label="Customers" icon="users" href="#customers"></cm-nav-item>
    <cm-nav-item label="Reports" icon="chart" href="#reports"></cm-nav-item>
    <cm-nav-item label="Marketing" icon="megaphone" href="#marketing"></cm-nav-item>
    <cm-nav-item label="Application" icon="apps" href="#apps" badge="3 apps active"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Support">
    <cm-nav-item label="Hire an Expert" icon="user" href="#expert" badge="New"></cm-nav-item>
    <cm-nav-item label="Help Centre" icon="help" href="#help"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item label="Subscription">
    <cm-nav-item label="Subscription" icon="repeat" href="#subscription"></cm-nav-item>
    <cm-nav-item label="Refer and Earn" icon="gift" href="#refer"></cm-nav-item>
  </cm-nav-item>
  <cm-nav-item>
    <cm-nav-item label="Settings" icon="settings">
      <cm-nav-item label="Shipping" href="#shipping"></cm-nav-item>
      <cm-nav-item label="Packaging Material" href="#packaging"></cm-nav-item>
      <cm-nav-item label="Tax" href="#tax"></cm-nav-item>
      <cm-nav-item label="Domain Setup" href="#domain"></cm-nav-item>
      <cm-nav-item label="Password Protection" href="#password"></cm-nav-item>
      <cm-nav-item label="Staff Management" href="#staff"></cm-nav-item>
      <cm-nav-item label="Configuration" href="#configuration"></cm-nav-item>
    </cm-nav-item>
  </cm-nav-item>
</cm-mobile-menu>
</div>` },
    ],
    do: ['Open it from "More" in the Bottom navigation and keep the Bottom navigation visible under it.', 'Group rows the way merchants think: channels, panels, support, subscription, settings.', 'Put what the Header bar hides on phones (store, account, Hire an Expert, subscription) in here.'],
    dont: ['Don\'t use it inside an app.', 'Don\'t nest deeper than one sub-screen.', 'Don\'t put more than one action per section.'],
    content: ['Section headings are one word: "Channels", "Support".', 'Badges are two or three words: "3 apps active", "New".'],
    a11y: ['A `nav` landmark named "Menu"; each section is a region named by its heading, and rows are links or buttons.', 'Opening a row with sub-items shows a second screen and moves focus to its back button (named after the section); Back or Escape returns focus to the row.', 'Icons are decorative; the avatar letter is hidden and the row is named by the user\'s name.', 'Differs from Figma: icons are our line icons in `icon-responsive-menu` grey (Figma\'s are PNGs); badges use `nav-badge` blue with white text instead of light blue (#E5F2FF/#327EC2, below AA at 8px); badge text is 10px instead of 8px.'],
    related: ['app-frame', 'bottom-navigation', 'side-navigation', 'header-bar'],
  },
  {
    slug: 'flash-offer-bar', tag: 'cm-flash-offer-bar', react: 'FlashOfferBar', name: 'Flash offer bar', group: 'Navigation',
    responsive: ["When the window is 640px wide or less, the text is 14px and starts at the left instead of the centre, and the bar is at least 44px tall."],
    summary: 'A dark strip across the top of the page with one short offer and a green link.',
    lead: 'A 56px `bg-flash-bar` strip with a green send icon and one centred 18px line of white text. The link inside it is green and medium weight. On phones the text is 14px and starts at the left.',
    examples: [
      { title: 'Plan offer', html: `<cm-flash-offer-bar>
  Publish your store with a Commmerce plan - <a href="#plans">Click here</a> to pick a plan
</cm-flash-offer-bar>` },
      { title: 'Dismissible', description: 'The bar hides itself on close; remember the choice so it doesn\'t come back on every page.',
        html: `<cm-flash-offer-bar dismissible icon="percent">
  Festive sale: 20% off annual plans until 30 November. <a href="#plans">See plans</a>
</cm-flash-offer-bar>` },
    ],
    do: ['Use it for one time-limited offer or a setup step that blocks selling (publishing the store).', 'Keep it to one line on desktop.', 'Let merchants dismiss offers that are not required.'],
    dont: ['Don\'t use it for errors or warnings: use a Banner.', 'Don\'t stack two bars.', 'Don\'t put more than one link in it.'],
    content: ['Lead with the benefit, then the action: "Publish your store with a Commmerce plan - Click here to pick a plan".', 'The link text says what happens: "See plans", not just "Click here", where you can.'],
    a11y: ['A region named "Offer" (set `label` to change it), so screen-reader users can find or skip it.', 'The link is a normal link inside the text; the green (`text-speciality-on-dark`) is 6.3:1 on the bar.', 'The close button is named "Dismiss offer".', 'Differs from Figma: the launch icon (a PNG) is our line `send` icon; Figma\'s bar is fixed at 1600px wide, ours fills its container; the dismiss button is new.'],
    related: ['banner', 'header-bar'],
  },
  {
    slug: 'link-tabs', tag: 'cm-link-tabs', react: 'LinkTabs', name: 'Link tabs', group: 'Navigation',
    responsive: ["Tabs stay on one line; when they don't fit the component's width, the row scrolls sideways.", "When the window is 640px wide or less, tabs are 14px and 18px apart instead of 16px and 28px."],
    summary: 'Links between sibling pages, such as the sections of Settings.',
    lead: 'A row of 16px medium links over a thin rule, 28px apart. The page you are on is black with a black underline; the others are grey. Each tab is its own page with its own address, so it can be bookmarked and opened in a new tab. To filter one list in place, use Status tabs.',
    examples: [
      { title: 'Settings sections', html: `<cm-link-tabs label="Settings sections">
  <cm-nav-item label="General" href="#general" current></cm-nav-item>
  <cm-nav-item label="Payments" href="#payments"></cm-nav-item>
  <cm-nav-item label="Shipping" href="#shipping"></cm-nav-item>
  <cm-nav-item label="Tax" href="#tax"></cm-nav-item>
  <cm-nav-item label="Domains" href="#domains"></cm-nav-item>
  <cm-nav-item label="Notifications" href="#notifications"></cm-nav-item>
</cm-link-tabs>` },
      { title: 'Parts of a product, with counts', html: `<cm-link-tabs label="Product sections">
  <cm-nav-item label="Details" href="#details"></cm-nav-item>
  <cm-nav-item label="Variants" href="#variants" badge="12" current></cm-nav-item>
  <cm-nav-item label="Inventory" href="#inventory"></cm-nav-item>
  <cm-nav-item label="Reviews" href="#reviews" badge="233"></cm-nav-item>
</cm-link-tabs>` },
    ],
    do: ['Put it under the Page header, above the page content.', 'Give each tab its own URL and mark the page you are on `current`.', 'Name it with `label` ("Settings sections").'],
    dont: ['Don\'t use it to filter a list: use Status tabs.', 'Don\'t use it for steps in a sequence.', 'Don\'t use more than about seven tabs.'],
    content: ['One or two words per tab, in sentence case.', 'Counts (`badge`) are whole numbers.'],
    a11y: ['A `nav` landmark of links, not ARIA tabs: each tab loads a page, so links and `aria-current="page"` are the right semantics. Tab moves between them.', 'The current page is marked with `aria-current`, not only colour and underline.', 'Differs from the queue\'s plan: the Figma "Link Tabs" page is the order-status filter (built as Status tabs in batch 3), so Link tabs has no Figma page of its own. It reuses the Status tabs styling at 16px and is a proposal for Nirmal to confirm.'],
    related: ['status-tabs', 'page-header', 'side-navigation'],
  },
  {
    slug: 'app-card', tag: 'cm-app-card', react: 'AppCard', name: 'App card', group: 'Marketplace',
    responsive: ["Follows the card's own width, not the window: at 380px or narrower, the padding drops from 20px to 10px, the logo box shrinks from 130 × 54px to 100 × 40px, and the details link moves to the end of the actions row."],
    summary: 'One app in the Commmerce app marketplace: logo, name, rating, pricing, offer and actions.',
    lead: 'A white card with a `border-default` edge and 6px corners. A 130×54 logo tile leads, then the 16px app name, "By" and the developer, a gold star with the rating and an underlined reviews link, the pricing line, an optional offer on a pale blue line, and the actions: Sign Up (primary), Contact (secondary) and an underlined View Details link. In narrow columns the padding and logo tile shrink.',
    examples: [
      { title: 'Marketplace grid', html: `<div style="display:grid;gap:var(--cm-space-20);grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
  <cm-app-card name="Paywise Payments" developer="Appsell" rating="4.3" reviews="902" reviews-href="#reviews"
      pricing="Free plan available. 7-day free trial." offer="Bundle products and kits with Bundle Manager: 20% off" href="#paywise">
    <cm-icon slot="logo" name="wallet" size="32" label="Paywise Payments"></cm-icon>
    <cm-button slot="actions" variant="primary">Sign Up</cm-button>
    <cm-button slot="actions">Contact</cm-button>
  </cm-app-card>
  <cm-app-card name="ShipQuick" developer="Lumen Labs" rating="4.1" reviews="318" reviews-href="#reviews"
      pricing="From ₹ 499 a month." href="#shipquick">
    <cm-icon slot="logo" name="send" size="32" label="ShipQuick"></cm-icon>
    <cm-button slot="actions" variant="primary">Sign Up</cm-button>
    <cm-button slot="actions">Contact</cm-button>
  </cm-app-card>
</div>` },
      { title: 'Installed, with an on/off switch', description: 'The `status` slot sits in the top-right corner.',
        html: `<div style="max-width:410px">
<cm-app-card name="Paywise Payments" developer="Appsell" rating="4.3" reviews="902" pricing="Free plan available. 7-day free trial." href="#paywise">
  <cm-icon slot="logo" name="wallet" size="32" label="Paywise Payments"></cm-icon>
  <cm-toggle slot="status" checked aria-label="Paywise Payments on"></cm-toggle>
  <cm-button slot="actions">Settings</cm-button>
</cm-app-card>
</div>` },
    ],
    do: ['Show cards in a grid of equal columns (about 300–410px each); they stretch to the same height.', 'Use the app\'s real logo image with `alt` set to the app name.', 'Set `heading-level` to fit the page: 2 under the page title, 3 under a section heading.'],
    dont: ['Don\'t tint the logo tile with the app\'s brand colour: the admin uses Commmerce\'s palette only.', 'Don\'t put more than two buttons in `actions`.', 'Don\'t round ratings to whole stars; show one decimal.'],
    content: ['Pricing is one sentence: "Free plan available. 7-day free trial."', 'Offers are short and specific: what, how much, until when.', 'Keep Figma\'s button words: "Sign Up", "Contact", "View Details".'],
    a11y: ['An `article` named by the app name, which is a heading (level 3 by default).', 'The rating is read as "Rated 4.3 out of 5"; the star is decorative. The reviews count is a link when `reviews-href` is set.', 'View Details is named "View details of <app>", so a page of cards doesn\'t have ten identical links.', 'Differs from Figma: the logo tile is neutral `bg-inset` instead of a brand tint (owner decision: Commmerce palette only); the offer text is 11px instead of 10px; Figma\'s star and discount icons (PNGs) are our `star` and `percent` line icons; cards fill their grid column instead of a fixed 410px.'],
    related: ['card', 'button', 'toggle'],
  },
  {
    slug: 'modal', tag: 'cm-modal', react: 'Modal', name: 'Modal', group: 'Overlays',
    responsive: ["Never wider than the window minus 32px (`small` 400px, `medium` 620px, `large` 900px otherwise)."],
    summary: 'A dialog over the page for a short task or a decision that has to be made before going on.',
    lead: 'A white panel with 4px corners over a dimmed page: a black header with the 14px title and a close button, the content with 20px padding, and the actions in a footer, right-aligned. Three widths: `small` (400px) for confirmations, `medium` (620px) and `large` (900px) for lists. It is a native modal `<dialog>`: the page behind is inert, Esc and the backdrop ask to close, the page stops scrolling, and focus returns to the button that opened it. Open it with `show()` or the `open` attribute.',
    examples: [
      { title: 'Confirm before deleting', description: 'Press the button to open it. In your app, call `show()` or set `open`.',
        html: `<cm-button data-opens="del">Delete product</cm-button>
<cm-modal id="del" heading="Delete “Linen shirt”?" size="small">
  <p style="margin:0">The product and its 4 variants will be deleted. This can't be undone.</p>
  <cm-button slot="footer">Cancel</cm-button>
  <cm-button slot="footer" variant="primary">Delete product</cm-button>
</cm-modal>` },
      { title: 'A short form', description: 'Put `autofocus` on the field the merchant will fill first.',
        html: `<cm-button data-opens="track">Change tracking info</cm-button>
<cm-modal id="track" heading="Change tracking info">
  <div style="display:grid;gap:var(--cm-space-15)">
    <cm-text-field label="Tracking number" autofocus></cm-text-field>
    <cm-select label="Carrier"><option>Delhivery</option><option>Blue Dart</option><option>Other</option></cm-select>
  </div>
  <cm-button slot="footer">Cancel</cm-button>
  <cm-button slot="footer" variant="primary">Save</cm-button>
</cm-modal>` },
    ],
    states: [
      { title: 'Error and saving', description: 'Validation errors show on the field, inside the modal; while saving, the main button shows `loading`. Press the button to open it.',
        html: `<cm-button data-opens="track-err">Change tracking info</cm-button>
<cm-modal id="track-err" heading="Change tracking info">
  <div style="display:grid;gap:var(--cm-space-15)">
    <cm-text-field label="Tracking number" value="DL12" error="Tracking numbers from Delhivery have 13 digits"></cm-text-field>
    <cm-select label="Carrier" value="Delhivery"><option>Delhivery</option><option>Blue Dart</option></cm-select>
  </div>
  <cm-button slot="footer">Cancel</cm-button>
  <cm-button slot="footer" variant="primary" loading>Save</cm-button>
</cm-modal>` },
    ],
    do: ['Use it for one short task the merchant must finish or cancel before going on.', 'Name the main action with a verb that says what happens: "Delete product", not "OK".', 'Cancel `cm-close` when closing would lose typed changes, and ask first.', 'Close it yourself (`close()`) after the main action succeeds.'],
    dont: ['Don\'t open a modal from a modal.', 'Don\'t use it for long forms or pages of content: use a page or a Side panel.', 'Don\'t use it for messages that don\'t need an answer: use a Banner.'],
    content: ['The title is a question or a task: "Delete “Linen shirt”?", "Change tracking info".', 'Say what will happen and whether it can be undone, in one or two sentences.', 'Put the main action last; Cancel first.'],
    a11y: ['A native modal `<dialog>` named by its heading; the rest of the page is inert, so Tab stays inside (it can still reach the browser\'s own controls, as with every native dialog).', 'Opening focuses the child with `autofocus`, otherwise the panel itself so its title is read. Closing returns focus to the element that opened it.', 'Esc, the close button ("Close", `close-label`) and a click on the backdrop fire a cancelable `cm-close` with `detail.reason`.', 'Page scrolling is locked while it is open.', 'Differs from Figma: corners are 4px (`radius-sm`); widths are three fixed sizes rather than per-screen frames.'],
    related: ['side-panel', 'banner', 'button'],
  },
  {
    slug: 'side-panel', tag: 'cm-side-panel', react: 'SidePanel', name: 'Side panel', group: 'Overlays',
    responsive: ["Never wider than the window (`small` 380px, `medium` 450px, `large` 720px otherwise).", "When the window is narrower than 600px, the panel becomes a card inset 16px from every edge of the screen."],
    summary: 'A panel over the right edge of the page with the details of one item, without leaving the list.',
    lead: 'A full-height white panel on the right (450px; `small` 380px, `large` 720px) over a dimmed page: a black header with the 14px title and a close button, the content with 20px padding, and an optional footer. On phones it becomes a card inset 16px from the screen edges. Like Modal it is a native modal `<dialog>`: Esc and the backdrop ask to close, the page stops scrolling, and focus returns to the opener.',
    examples: [
      { title: 'Enquiry details', description: 'Press the button to open it. In your app, call `show()` or set `open`.',
        html: `<cm-button data-opens="inq">View enquiry</cm-button>
<cm-side-panel id="inq" heading="Inquiry">
  <cm-info-panel>
    <cm-info-item label="Date added">Mar 29, 2026 3:45 AM</cm-info-item>
    <cm-info-item label="Name">Robinson Painatillo</cm-info-item>
    <cm-info-item label="Email"><a href="mailto:robinson@example.com">robinson@example.com</a></cm-info-item>
    <cm-info-item label="Message">Do you ship to Pune? I'd like 20 shirts for a team event.</cm-info-item>
  </cm-info-panel>
  <cm-accordion heading="Email and phone were found in 2 orders" style="margin-top:var(--cm-space-20)">
    <p style="margin:0"><a href="#order">#NAY0D0736</a>, 20-12-2025</p>
  </cm-accordion>
  <cm-button slot="footer" variant="primary">Reply</cm-button>
</cm-side-panel>` },
    ],
    states: [
      { title: 'Loading', description: 'Open the panel at once and fill it with skeletons while the details load. Press the button to open it.',
        html: `<cm-button data-opens="inq-load">View enquiry</cm-button>
<cm-side-panel id="inq-load" heading="Inquiry">
  <div aria-busy="true" class="stack"><cm-skeleton lines="6"></cm-skeleton></div>
</cm-side-panel>` },
    ],
    do: ['Use it to look at or lightly edit one item from a list, keeping the list in place behind.', 'Keep the title to what the item is: "Inquiry", "Order #1042".'],
    dont: ['Don\'t use it for a task that needs the whole page: open the item\'s page instead.', 'Don\'t stack a Modal on top of it.'],
    content: ['Show the most useful facts first; group the rest in Accordions.'],
    a11y: ['A native modal `<dialog>` named by its heading; the page behind is inert.', 'Opening focuses an `autofocus` child, otherwise the panel. Esc, the close button and the backdrop fire a cancelable `cm-close`; focus returns to the opener.', 'Differs from Figma: the "Side Popup" frames are 450px with square corners; ours are the same on desktop, with three widths, and a 16px inset with 4px corners on phones (Figma\'s responsive frame shows the inset).'],
    related: ['modal', 'filter-panel', 'info-panel', 'accordion'],
  },
  {
    slug: 'filter-panel', tag: 'cm-filter-panel', react: 'FilterPanel', name: 'Filter panel', group: 'Overlays',
    responsive: ["The same as Side panel: never wider than the window, and below 600px of window width it becomes a card inset 16px from every edge of the screen."],
    summary: '"Search and Filter": a Side panel with a search field, the fields that narrow a list, and Reset and Search.',
    lead: 'A Side panel titled "Search and Filter". With `search` it starts with a search field ("Search anything"); then your fields in a `<form>`, 15px apart; then Reset and Search, centred at the bottom. Search fires `cm-filter-apply` with the form\'s values and the query, then closes. Reset puts the form back to its first values. Open it from the filter button of a Search field (`cm-filter`).',
    examples: [
      { title: 'Filter products', description: 'Press the filter button in the search field. In your app, listen for `cm-filter` and call `show()`.',
        html: `<cm-search label="Search products" filter data-opens="filters"></cm-search>
<cm-filter-panel id="filters" search>
  <form>
    <cm-text-field label="Product name" name="name"></cm-text-field>
    <cm-select label="Product status" name="status"><option value="">Any</option><option value="active">Active</option><option value="inactive">Inactive</option></cm-select>
    <cm-select label="Product type" name="type"><option value="">Any</option><option>Clothing</option><option>Accessories</option></cm-select>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--cm-space-15)">
      <cm-text-field label="From" name="from" type="date"></cm-text-field>
      <cm-text-field label="To" name="to" type="date"></cm-text-field>
    </div>
    <cm-text-field label="Tags" name="tags"></cm-text-field>
  </form>
</cm-filter-panel>` },
    ],
    do: ['Give every field a `name`: it becomes the key in `detail.values`.', 'Start every field empty or at "Any", so Reset means "no filters".', 'Show the number of active filters on the search field (`filter-count`).'],
    dont: ['Don\'t apply filters while the merchant is still choosing: apply on Search.', 'Don\'t put more than about eight fields here; offer the rarely used ones as a saved view instead.'],
    content: ['Field labels name what is filtered: "Product status", not "Choose status".', 'Keep the button words "Reset" and "Search" (from Figma) unless the list is not searched.'],
    a11y: ['A Side panel: a native modal `<dialog>` named "Search and Filter", inert page behind, Esc closes, focus returns to the filter button.', 'Enter in the search field applies, like Search. Pressing Search with the form invalid can be stopped by cancelling `cm-filter-apply`.', 'Empty values are left out of `detail.values`; a name used by several checked boxes gives an array.'],
    related: ['side-panel', 'search', 'select', 'resource-list'],
  },
  {
    slug: 'action-menu', tag: 'cm-action-menu', react: 'ActionMenu', name: 'Action menu', group: 'Overlays',
    responsive: ["The menu is at most 320px wide, and never wider than the window minus 32px."],
    parts: [{ tag: 'cm-menu-item', react: 'MenuItemElement' }],
    summary: 'A button that opens a short list of actions: row actions, "Add…" menus, or the account menu.',
    lead: 'A white list with 4px corners and a soft shadow, 4px under its trigger. Each choice is a 13px row, 30px high; the highlighted one is black with white text, as in Figma. `<hr>` between `cm-menu-item`s draws a line between groups, and `heading` / `subheading` put a name and email on top (the account menu). The built-in trigger is a button with the label and a chevron, or a ⋮ icon button with `icon-only`; or bring your own with `slot="trigger"`.',
    examples: [
      { title: 'Row actions', html: `<cm-action-menu icon-only label="Order #1042 actions">
  <cm-menu-item value="cancel">Cancel shipment</cm-menu-item>
  <cm-menu-item value="tracking">Change tracking info</cm-menu-item>
</cm-action-menu>` },
      { title: 'Add menu', html: `<cm-action-menu trigger-label="Add">
  <cm-menu-item icon="box" value="product">Add product</cm-menu-item>
  <cm-menu-item icon="menu" value="category">Add category</cm-menu-item>
  <cm-menu-item icon="users" value="customer">Add customer</cm-menu-item>
  <cm-menu-item icon="cart" value="order">Add order</cm-menu-item>
</cm-action-menu>` },
      { title: 'Account menu', description: 'Groups split by `<hr>`; the destructive choice is `critical`. `align="end"` lines the menu up with the right edge of a trigger at the right of the page.',
        html: `<div style="display:flex;justify-content:flex-end">
<cm-action-menu trigger-label="Robinson" heading="Robinson Jain" subheading="robinson@example.com" align="end">
  <cm-menu-item href="#profile">My profile</cm-menu-item>
  <cm-menu-item href="#subscription">Subscription</cm-menu-item>
  <cm-menu-item href="#support">Support</cm-menu-item>
  <cm-menu-item href="#refer">Refer and earn</cm-menu-item>
  <hr>
  <cm-menu-item value="switch">Switch store</cm-menu-item>
  <cm-menu-item value="new-store">Create new store</cm-menu-item>
  <hr>
  <cm-menu-item value="sign-out">Sign out</cm-menu-item>
</cm-action-menu>
</div>` },
    ],
    states: [
      { title: 'Disabled item', description: 'Keep an action that can\'t be used now in its place, disabled, so the menu doesn\'t change shape.',
        html: `<cm-action-menu icon-only label="Order #1042 actions">
  <cm-menu-item value="tracking">Change tracking info</cm-menu-item>
  <cm-menu-item value="cancel" disabled>Cancel shipment</cm-menu-item>
</cm-action-menu>` },
    ],
    do: ['Use it for actions, not for choosing a value in a form: that is Select.', 'Keep it to about eight choices, grouped with `<hr>`.', 'Give icon-only menus a `label` that names the thing acted on: "Order #1042 actions".'],
    dont: ['Don\'t hide the one main action of a page in a menu: show it as a Button.', 'Don\'t put a menu inside a menu.'],
    content: ['Start each choice with a verb: "Cancel shipment", "Add product".', 'Use sentence case.'],
    a11y: ['The WAI-ARIA menu button pattern: the trigger has `aria-haspopup="menu"` and `aria-expanded`; the list is `role="menu"` with `menuitem`s and `separator`s.', '↓/↑ on the trigger open the menu on the first/last choice. In the menu: ↓/↑ (wrapping), Home/End and typing the first letters move; Enter/Space choose; Esc closes and returns focus to the trigger; Tab closes. Disabled choices are skipped.', 'A custom trigger gets the ARIA attributes set on it, so make it a native `<button>`.', 'Differs from Figma: the highlight follows the keyboard and the pointer (Figma shows one fixed black row); 6px inner padding and 4px corners; icons are our line icons (Figma\'s are PNGs).'],
    related: ['button', 'bottom-sheet', 'select'],
  },
  {
    slug: 'bottom-sheet', tag: 'cm-bottom-sheet', react: 'BottomSheet', name: 'Bottom sheet', group: 'Overlays',
    responsive: ["Full width up to 600px, then 600px wide and centred at the bottom of the window."],
    parts: [{ tag: 'cm-menu-item', react: 'MenuItemElement' }],
    summary: 'A sheet that rises from the bottom of a phone screen with a few actions or shortcuts.',
    lead: 'White, with 20px top corners and a round 36px black close button on its top edge, over a dimmed page; at most 600px wide on larger screens. Rows are 44px, split by thin lines. Rows without icons are centred (actions, "Mark as paid order"); rows with icons line up left and end in a chevron (shortcuts, "Orders"). It is the phone version of Action menu and uses the same `cm-menu-item`s. A native modal `<dialog>`, like Modal.',
    examples: [
      { title: 'Order actions', description: 'Press the button to open it. In your app, call `show()` or set `open`.',
        html: `<cm-button data-opens="acts">More actions</cm-button>
<cm-bottom-sheet id="acts" heading="Order actions">
  <cm-menu-item value="paid">Mark as paid order</cm-menu-item>
  <cm-menu-item value="invoice">Generate invoice</cm-menu-item>
  <cm-menu-item value="cancel" critical>Cancel order</cm-menu-item>
</cm-bottom-sheet>` },
      { title: 'Shortcuts with icons', html: `<cm-button data-opens="quick">Quick add</cm-button>
<cm-bottom-sheet id="quick" heading="Shortcuts">
  <cm-menu-item icon="bag" href="#orders">Orders</cm-menu-item>
  <cm-menu-item icon="box" href="#add-order">Add orders</cm-menu-item>
  <cm-menu-item icon="cart" href="#abandoned">Abandoned cart</cm-menu-item>
  <cm-menu-item icon="help" href="#enquiries">Contact enquiries</cm-menu-item>
</cm-bottom-sheet>` },
    ],
    do: ['Use it on phones in place of an Action menu or a small Modal.', 'Keep it to five rows or fewer.', 'Set `heading` (it is not shown) so screen readers announce what the sheet is for.'],
    dont: ['Don\'t mix rows with and without icons in one sheet.', 'Don\'t put a long form in a sheet: open a page.'],
    content: ['Start actions with a verb: "Generate invoice". Shortcuts are the page name: "Orders".'],
    a11y: ['A native modal `<dialog>` named by the hidden `heading` (or `label`); the page behind is inert.', 'The close button is named "Close" (`close-label`). Esc and the backdrop fire a cancelable `cm-close`; focus returns to the opener.', 'Choosing a row fires a cancelable `cm-select`, then closes with reason `action`.', 'Differs from Figma: 36px close button (Figma 30px) so it is an easier target; rows are 44px tall (Figma about 34px) for touch; icons are our line icons (Figma\'s are PNGs).'],
    related: ['action-menu', 'modal', 'bottom-navigation'],
  },
  {
    slug: 'notification-panel', tag: 'cm-notification-panel', react: 'NotificationPanel', name: 'Notification panel', group: 'Overlays', adminOnly: true,
    responsive: ["At most 380px wide, and never wider than the window minus 32px.", "When the window is narrower than 600px, the panel spans the screen with 8px on each side."],
    parts: [{ tag: 'cm-notification-item', react: 'NotificationItemElement' }],
    summary: 'Recent notifications, opened from the bell in the header bar. For Commmerce products only, not for apps.',
    lead: 'A 380px panel under the top-right corner of the page (on phones, the screen width less 8px each side) over a dimmed page. A black "Notifications" header with a close button, then one 40px row per notification, alternately white and light grey: a small coloured icon for its kind (`information`, `attention`, `success`, `critical`), what happened, and when. Unread ones are bold. "See more notifications" links to the full list. Move it with `--cm-notification-panel-top` and `--cm-notification-panel-end`. It belongs to the admin: apps can\'t add to it (App Bridge has toasts, not notifications).',
    examples: [
      { title: 'From the header bell', description: 'Press the button to open it. In your app, open it from the header bar\'s bell.',
        html: `<cm-button data-opens="notes">Notifications</cm-button>
<cm-notification-panel id="notes" more-href="#notifications">
  <cm-notification-item time="1 min ago" href="#order-1042" unread>New order received</cm-notification-item>
  <cm-notification-item time="12 mins ago" tone="attention" href="#stock" unread>Product low stock</cm-notification-item>
  <cm-notification-item time="1 hr ago" tone="success" href="#order-1041">Payment received</cm-notification-item>
  <cm-notification-item time="3 hrs ago" tone="attention" href="#variants">Product variant out of stock</cm-notification-item>
  <cm-notification-item time="1 day ago" tone="critical" href="#order-1037">Order cancelled</cm-notification-item>
</cm-notification-panel>` },
      { title: 'Mark all read, second lines, icons and a footer control', description: '`mark-all-read` shows "Mark all read" in the header while any notification is unread; it fires `cm-mark-all-read` and you clear `unread`. `description` adds a second line, `icon` picks an icon for the kind (in the tone\'s colours), and the `footer` slot holds a control such as a push-notifications toggle.',
        html: `<cm-button data-opens="notes-crm">Notifications</cm-button>
<cm-notification-panel id="notes-crm" mark-all-read more-href="#notifications">
  <cm-notification-item time="2 mins ago" icon="clock" tone="attention" description="Follow-up due at 4 pm" href="#task-81" unread>Call Ravi Stores</cm-notification-item>
  <cm-notification-item time="20 mins ago" icon="user" description="From the website form" href="#lead-311" unread>New lead: Asha Textiles</cm-notification-item>
  <cm-notification-item time="1 hr ago" icon="send" tone="success" description="Quote #Q-1043" href="#email-17">Email opened by Kiran Rao</cm-notification-item>
  <cm-notification-item time="3 hrs ago" icon="help" description="Ticket #5531" href="#ticket-5531">Customer replied</cm-notification-item>
  <cm-toggle slot="footer" label="Push notifications on this device"></cm-toggle>
</cm-notification-panel>` },
    ],
    states: [
      { title: 'Empty', description: 'With no items the panel says so (`empty-text`). Press the button to open it.',
        html: `<cm-button data-opens="notes-empty">Notifications</cm-button>
<cm-notification-panel id="notes-empty" empty-text="No notifications yet. New orders and stock alerts appear here."></cm-notification-panel>` },
      { title: 'Loading', description: 'Set `loading` while you fetch: grey placeholder rows show and "Loading" is announced politely. Press the button to open it.',
        html: `<cm-button data-opens="notes-loading">Notifications</cm-button>
<cm-notification-panel id="notes-loading" loading></cm-notification-panel>` },
    ],
    do: ['Show the newest first, and at most about ten; link the rest with `more-href`.', 'Link every notification to the thing it is about.', 'Mark notifications read when the merchant opens them; offer `mark-all-read` and clear `unread` on `cm-mark-all-read`.', 'Set `loading` while the list is fetched instead of a fake "Loading" item.', 'Keep the second line short (`description`): who or when, "Follow-up due at 4 pm".'],
    dont: ['Don\'t use it for messages that need an answer now: show a Banner on the page.', 'Don\'t use it in apps: it is admin chrome.'],
    content: ['Say what happened in a few words: "New order received", "Product low stock".', 'Times are relative and short: "1 min ago", "3 hrs ago", "1 day ago".'],
    a11y: ['A native modal `<dialog>` named "Notifications"; the page behind is inert. Esc, the close button and the backdrop fire a cancelable `cm-close`; focus returns to the bell.', 'Unread notifications start with "Unread:" for screen readers, not only bold text. The kind icon is decorative; the words say what happened. A second line is read after the label, separated by a comma.', '"Mark all read" is a real button in the header. When it disappears (nothing unread any more), focus moves to the panel instead of being lost.', 'While `loading`, the placeholder rows are hidden from screen readers and "Loading" is announced through a polite status region.', 'Choosing a notification fires a cancelable `cm-select` (cancel it to route in a single-page app), then closes.', 'Differs from Figma: kind icons are our line icons in the tone colours (Figma\'s are PNG squares); rows are 40px tall (Figma about 26px) for touch; the header says "Notifications" on desktop too (Figma: "Notification").'],
    related: ['header-bar', 'banner', 'badge'],
  },
];

// Components that are not usable yet. Every entry gets a status page at #components--<slug>, so no
// link is a dead end. status: 'in-progress' = the next batch in BUILD-QUEUE.md; 'planned' = later.
// When a batch starts, set its entries to 'in-progress'; when a component ships, delete its entry here
// and add it to `components` above.
export const planned = [
];

export const groupsOrder = ['Actions', 'Forms', 'Layout', 'Lists', 'Feedback', 'Overlays', 'Navigation', 'Marketplace', 'Images and icons'];
