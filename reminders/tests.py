from io import StringIO
from pathlib import Path
from datetime import date, datetime
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.utils.datastructures import MultiValueDict

from reminders.forms import EventForm
from reminders.utils import process_bulk_import
from reminders.models import Event


class AutomationCommandTests(TestCase):
	@patch('reminders.management.commands.trigger_reminders.send_upcoming_reminders')
	def test_trigger_reminders_command_calls_utility(self, mock_send):
		mock_send.return_value = {'sent_count': 1, 'total_events': 2}
		out = StringIO()

		call_command('trigger_reminders', stdout=out)

		mock_send.assert_called_once_with()
		self.assertIn('Sent 1 of 2 reminders', out.getvalue())

	@patch('reminders.management.commands.send_deletion_notifications.send_deletion_notifications')
	def test_send_deletion_notifications_command_calls_utility(self, mock_send):
		mock_send.return_value = {'sent_count': 3, 'total_events': 5}
		out = StringIO()

		call_command('send_deletion_notifications', stdout=out)

		mock_send.assert_called_once_with()
		self.assertIn('Sent 3 of 5 deletion notifications', out.getvalue())

	@patch('reminders.management.commands.cleanup_expired_media.cleanup_expired_media')
	def test_cleanup_expired_media_command_calls_utility(self, mock_cleanup):
		mock_cleanup.return_value = {'deleted_count': 2, 'total_events': 4}
		out = StringIO()

		call_command('cleanup_expired_media', stdout=out)

		mock_cleanup.assert_called_once_with()
		self.assertIn('Deleted media for 2 of 4 events', out.getvalue())

	@patch('reminders.management.commands.delete_expired_media.delete_media_from_storage')
	@patch('reminders.management.commands.delete_expired_media.create_client')
	@patch('reminders.management.commands.delete_expired_media.ReminderEmailService.send_deletion_notification')
	def test_delete_expired_media_command_preserves_storage_delete(self, mock_send_notification, mock_create_client, mock_delete_media):
		User = get_user_model()
		user = User.objects.create_user(username='cleanup_user', email='cleanup@example.com', password='pass12345')
		today_event = Event.objects.create(
			user=user,
			name='Today Event',
			event_type='birthday',
			date=date(2026, 4, 13),
			remind_days_before=1,
		)
		old_event = Event.objects.create(
			user=user,
			name='Old Event',
			event_type='anniversary',
			date=date(2026, 4, 1),
			remind_days_before=1,
		)
		from reminders.models import EventMedia
		EventMedia.objects.create(event=today_event, media_file='user/today/file.jpg', media_type='image')
		EventMedia.objects.create(event=old_event, media_file='user/old/file.jpg', media_type='image')

		mock_supabase = Mock()
		mock_create_client.return_value = mock_supabase
		mock_delete_media.return_value = True
		out = StringIO()

		with patch('reminders.management.commands.delete_expired_media.timezone.now') as mock_now:
			mock_now.return_value = datetime(2026, 4, 13, 12, 0, 0)
			call_command('delete_expired_media', stdout=out)

		mock_send_notification.assert_called_once()
		mock_create_client.assert_called_once()
		mock_delete_media.assert_called_once()
		self.assertIn('delete_expired_media completed', out.getvalue())


class TriggerEndpointTests(TestCase):
	@patch('reminders.views.send_upcoming_reminders')
	@patch('reminders.views.settings.REMINDER_CRON_SECRET', 'test-secret')
	def test_trigger_endpoint_accepts_valid_token(self, mock_send):
		response = self.client.post(
			reverse('send_daily_reminders'),
			{'token': 'test-secret'},
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()['message'], 'Reminders sent successfully')
		mock_send.assert_called_once_with()

	@patch('reminders.views.settings.REMINDER_CRON_SECRET', '')
	def test_trigger_endpoint_returns_503_when_secret_missing(self):
		response = self.client.post(
			reverse('send_daily_reminders'),
			{'token': 'anything'},
		)

		self.assertEqual(response.status_code, 503)
		self.assertEqual(response.json()['error'], 'Server not configured')

	@patch('reminders.views.settings.REMINDER_CRON_SECRET', 'expected-secret')
	def test_trigger_endpoint_rejects_invalid_token(self):
		response = self.client.post(
			reverse('send_daily_reminders'),
			{'token': 'wrong-secret'},
		)

		self.assertEqual(response.status_code, 403)
		self.assertEqual(response.json()['error'], 'Unauthorized')


class BulkImportNormalizationTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username='bulk_tester',
			email='bulk_tester@example.com',
			password='test-pass-123'
		)

	def test_bulk_import_accepts_human_friendly_raksha_bandhan_with_bom_header(self):
		csv_content = (
			"\ufeffName,event_type,Date,remind_days_before,message,custom_label\n"
			"Sneha,Raksha Bandhan,2025-08-09,2,Happy Rakhi! Stay blessed,Sister\n"
		)
		uploaded = SimpleUploadedFile('events.csv', csv_content.encode('utf-8'), content_type='text/csv')

		result = process_bulk_import(self.user, uploaded)

		self.assertEqual(result['success_count'], 1)
		self.assertEqual(result['failure_count'], 0)
		event = Event.objects.get(user=self.user, name='Sneha')
		self.assertEqual(event.event_type, 'raksha_bandhan')


class AnniversaryTransitionContractTests(TestCase):
	def test_anniversary_transition_switch_includes_all_page_cases(self):
		root = Path(__file__).resolve().parents[1]
		js_path = root / 'static' / 'js' / 'card_anniversary.js'
		content = js_path.read_text(encoding='utf-8')

		self.assertIn('onPageLeaveAnimation(page, _nextPage, app, callback)', content)
		self.assertIn('switch (page)', content)
		for page_case in ('case 1:', 'case 2:', 'case 3:', 'case 4:', 'case 5:', 'case 6:'):
			self.assertIn(page_case, content)


class EventFormMemoryPersistenceTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username='memory_tester',
			email='memory_tester@example.com',
			password='test-pass-123'
		)
		self.event = Event.objects.create(
			user=self.user,
			name='Memory Event',
			event_type='anniversary',
			date=date(2026, 4, 21),
			remind_days_before=1,
			highlights='Year 1: First trip\nYear 2: New home',
			thread_of_memories='[{"year":"2020","title":"First date","description":"We met at a cafe"},{"year":"2021","title":"Proposal","description":"A quiet evening"}]',
		)

	def test_editing_highlights_keeps_thread_of_memories(self):
		form = EventForm(
			data={
				'name': 'Memory Event',
				'event_type': 'anniversary',
				'date': '2026-04-21',
				'remind_days_before': '1',
				'message': '',
				'custom_label': '',
				'cultural_theme': '',
				'memory_display_type': 'highlights',
				'highlights': 'Year 3: New milestone',
				'thread_of_memories': self.event.thread_of_memories,
				'is_recurring': 'on',
				'recipient_email': '',
				'auto_share_enabled': 'on',
				'raksha_bandhan_theme': '',
				'sibling_relationship': '',
				'sacred_promises': '',
				'rakhi_ceremony_notes': '',
			},
			instance=self.event,
		)

		self.assertTrue(form.is_valid())
		saved = form.save(commit=False)
		self.assertEqual(saved.thread_of_memories, self.event.thread_of_memories)
		self.assertEqual(saved.highlights, 'Year 3: New milestone')

	def test_editing_thread_keeps_highlights(self):
		form = EventForm(
			data={
				'name': 'Memory Event',
				'event_type': 'anniversary',
				'date': '2026-04-21',
				'remind_days_before': '1',
				'message': '',
				'custom_label': '',
				'cultural_theme': '',
				'memory_display_type': 'thread_of_memories',
				'highlights': self.event.highlights,
				'thread_of_memories': self.event.thread_of_memories,
				'is_recurring': 'on',
				'recipient_email': '',
				'auto_share_enabled': 'on',
				'raksha_bandhan_theme': '',
				'sibling_relationship': '',
				'sacred_promises': '',
				'rakhi_ceremony_notes': '',
			},
			instance=self.event,
		)

		self.assertTrue(form.is_valid())
		saved = form.save(commit=False)
		self.assertEqual(saved.highlights, self.event.highlights)
		self.assertEqual(saved.thread_of_memories, self.event.thread_of_memories)

	def test_form_accepts_expanded_image_and_audio_types(self):
		image_file = SimpleUploadedFile('cover.gif', b'gif-bytes', content_type='image/gif')
		audio_file = SimpleUploadedFile('message.m4a', b'm4a-bytes', content_type='audio/x-m4a')

		form = EventForm(
			data={
				'name': 'Memory Event',
				'event_type': 'anniversary',
				'date': '2026-04-21',
				'remind_days_before': '1',
				'message': '',
				'custom_label': '',
				'cultural_theme': '',
				'memory_display_type': 'highlights',
				'highlights': 'Year 3: New milestone',
				'thread_of_memories': self.event.thread_of_memories,
				'is_recurring': 'on',
				'recipient_email': '',
				'auto_share_enabled': 'on',
				'raksha_bandhan_theme': '',
				'sibling_relationship': '',
				'sacred_promises': '',
				'rakhi_ceremony_notes': '',
			},
			files=MultiValueDict({'image_files': [image_file], 'audio_files': [audio_file]}),
			instance=self.event,
		)

		self.assertTrue(form.is_valid())
