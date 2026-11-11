/*
 * What each webhook topic means, for the endpoint form. The list of topics an
 * endpoint can subscribe to comes from the backend (`GET
 * /developer/webhooks/events`); this only adds the sentence beside each one. A
 * topic the backend adds before it is described here still shows, by its id.
 */

export const TOPIC_DESCRIPTIONS: Record<string, string> = {
  "message.delivered": "A message reached the person, on any channel",
  "message.viewed": "An email was opened or an in-app message was seen",
  "message.clicked": "Someone clicked a link in a message",
  "contact.created": "A new contact joined the workspace",
  "contact.unsubscribed": "A contact opted out of a channel",
  "automation.completed": "A contact finished a Loop",
};

/** Topic prefix -> the heading it sits under. */
export const TOPIC_GROUPS: Record<string, string> = {
  message: "Messages",
  contact: "Contacts",
  automation: "Loops",
};
