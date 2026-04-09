from unittest.mock import patch

from django.test import Client, TestCase
from django.urls import reverse


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = Client()

    @patch('core.views.settings.MAILERSEND_API_KEY', '')
    def test_health_check_reports_healthy_when_db_query_succeeds(self):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['status'], 'healthy')
        self.assertEqual(payload['checks']['database'], 'ok')
        self.assertEqual(payload['checks']['supabase'], 'ok')
        self.assertEqual(payload['checks']['mailersend'], 'skipped')

    @patch('core.views.settings.MAILERSEND_API_KEY', '')
    @patch('core.views.Event.objects.count', side_effect=Exception('db down'))
    def test_health_check_reports_unhealthy_when_db_query_fails(self, _mock_count):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload['status'], 'unhealthy')
        self.assertEqual(payload['checks']['database'], 'failed')
        self.assertEqual(payload['checks']['supabase'], 'failed')
        self.assertEqual(payload['checks']['mailersend'], 'skipped')

    @patch('core.views.requests.get')
    @patch('core.views.settings.MAILERSEND_API_KEY', 'dummy-key')
    def test_health_check_reports_mailersend_ok_when_api_responds(self, mock_get):
        mock_get.return_value.raise_for_status.return_value = None

        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['checks']['mailersend'], 'ok')

    @patch('core.views.requests.get', side_effect=Exception('api down'))
    @patch('core.views.settings.HEALTH_CHECK_STRICT_MAILERSEND', False)
    @patch('core.views.settings.MAILERSEND_API_KEY', 'dummy-key')
    def test_health_check_does_not_fail_on_mailersend_error_by_default(self, _mock_get):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['checks']['mailersend'], 'failed')

    @patch('core.views.requests.get', side_effect=Exception('api down'))
    @patch('core.views.settings.HEALTH_CHECK_STRICT_MAILERSEND', True)
    @patch('core.views.settings.MAILERSEND_API_KEY', 'dummy-key')
    def test_health_check_fails_when_strict_mailersend_check_enabled(self, _mock_get):
        response = self.client.get(reverse('health_check'))

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload['checks']['mailersend'], 'failed')
