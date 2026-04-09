from unittest.mock import patch

from django.test import Client, TestCase
from django.urls import reverse


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = Client()

    @patch('core.views.settings.EMAIL_HOST_USER', '')
    @patch('core.views.settings.EMAIL_HOST_PASSWORD', '')
    def test_health_check_reports_healthy_when_db_query_succeeds(self):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['status'], 'healthy')
        self.assertEqual(payload['checks']['database'], 'ok')
        self.assertEqual(payload['checks']['supabase'], 'ok')
        self.assertEqual(payload['checks']['smtp'], 'skipped')

    @patch('core.views.settings.EMAIL_HOST_USER', '')
    @patch('core.views.settings.EMAIL_HOST_PASSWORD', '')
    @patch('core.views.Event.objects.count', side_effect=Exception('db down'))
    def test_health_check_reports_unhealthy_when_db_query_fails(self, _mock_count):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload['status'], 'unhealthy')
        self.assertEqual(payload['checks']['database'], 'failed')
        self.assertEqual(payload['checks']['supabase'], 'failed')
        self.assertEqual(payload['checks']['smtp'], 'skipped')

    @patch('core.views.get_connection')
    @patch('core.views.settings.EMAIL_HOST_PASSWORD', 'dummy-pass')
    @patch('core.views.settings.EMAIL_HOST_USER', 'dummy-user')
    def test_health_check_reports_smtp_ok_when_connection_opens(self, mock_connection):
        mock_connection.return_value.open.return_value = True

        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['checks']['smtp'], 'ok')

    @patch('core.views.get_connection', side_effect=Exception('smtp down'))
    @patch('core.views.settings.HEALTH_CHECK_STRICT_SMTP', False)
    @patch('core.views.settings.EMAIL_HOST_PASSWORD', 'dummy-pass')
    @patch('core.views.settings.EMAIL_HOST_USER', 'dummy-user')
    def test_health_check_does_not_fail_on_smtp_error_by_default(self, _mock_get):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['checks']['smtp'], 'failed')

    @patch('core.views.get_connection', side_effect=Exception('smtp down'))
    @patch('core.views.settings.HEALTH_CHECK_STRICT_SMTP', True)
    @patch('core.views.settings.EMAIL_HOST_PASSWORD', 'dummy-pass')
    @patch('core.views.settings.EMAIL_HOST_USER', 'dummy-user')
    def test_health_check_fails_when_strict_smtp_check_enabled(self, _mock_get):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload['checks']['smtp'], 'failed')
