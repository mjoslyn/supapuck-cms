// The site's configuration: identity, content types (fields, URLs, what Compose may fill) and
// taxonomies. The core reads it through src/lib/site; see src/lib/site/types.ts for every option.
// This is the example site: replace it with your own.
import { defineSite, type FieldDef } from '../lib/site/types';

const ADDRESS: FieldDef[] = [
  { key: 'address', label: 'Street address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'zip', label: 'Postal code', type: 'text' },
];

export default defineSite({
  name: 'Example Town',
  organization: 'Example Town Chamber of Commerce',
  timezone: 'America/New_York',
  mailFrom: 'Example Town <noreply@example.org>',
  adminEmail: 'info@example.org',
  brief: 'The Example Town Chamber of Commerce site: things to do, events and news for visitors and the businesses that serve them.',

  types: [
    { type: 'page', label: 'Pages', singular: 'Page', describe: 'a page on the site' },
    {
      type: 'event',
      label: 'Events',
      singular: 'Event',
      base: 'event',
      archive: '/events/',
      category: 'event_category',
      describe: 'an event on the calendar (/events/): its own page with the date, venue and details beside your content',
      card: 'event',
      fields: [
        { key: 'venue', label: 'Venue', type: 'entry', entryType: 'venue', create: ADDRESS },
        { key: 'cost', label: 'Cost', type: 'text', compose: 'price as written, e.g. "$25, kids free"' },
        { key: 'website', label: 'Event website', type: 'url', compose: 'event website or tickets URL' },
        {
          key: 'schedule', label: 'Schedule', type: 'repeater', itemLabel: 'day_label', itemName: 'day',
          fields: [
            { key: 'day_label', label: 'Day', type: 'text' },
            {
              key: 'items', label: 'Items', type: 'repeater', itemLabel: 'title', itemName: 'item',
              fields: [
                { key: 'time', label: 'Time', type: 'text' },
                { key: 'title', label: 'Title', type: 'text' },
                { key: 'location', label: 'Location', type: 'text' },
                { key: 'note', label: 'Note', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
    { type: 'post', label: 'Posts', singular: 'Post', archive: '/news/', category: 'category', describe: 'a news post (listed with the site news)' },
    {
      type: 'venue',
      label: 'Venues',
      singular: 'Venue',
      base: 'venue',
      record: true,
      fields: [...ADDRESS, { key: 'country', label: 'Country', type: 'text' }, { key: 'phone', label: 'Phone', type: 'text' }, { key: 'website', label: 'Website', type: 'url' }],
    },
    { type: 'organizer', label: 'Organizers', singular: 'Organizer', base: 'organizer', record: true, hidden: true },
    { type: 'global', label: 'Globals', singular: 'Global', pageless: true },
  ],

  taxonomies: [
    { name: 'category', label: 'Category', base: 'category' },
    { name: 'tag', label: 'Tag', base: 'tag' },
    { name: 'event_category', label: 'Event category', base: 'events/category' },
  ],
});
