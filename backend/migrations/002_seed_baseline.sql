insert into roles (role_name)
values
  ('end_user'),
  ('security_operator'),
  ('university_admin'),
  ('system_operator'),
  ('guardian_contact'),
  ('law_enforcement_liaison')
on conflict (role_name) do nothing;

insert into devices (external_device_id)
values ('BR-1001')
on conflict (external_device_id) do nothing;
