from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse


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
