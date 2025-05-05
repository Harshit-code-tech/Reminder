# from django.test import TestCase, Client
# from django.contrib.auth import get_user_model
# from django.utils import timezone
# from django.urls import reverse
# from .models import VerificationCode
#
# User = get_user_model()
#
# class VerificationCodeTests(TestCase):
#     def setUp(self):
#         self.user = User.objects.create_user(username='testuser', email='test@example.com', password='securepass123')
#
#     def test_old_code_invalidated_on_resend(self):
#         code1 = VerificationCode.objects.create(
#             user ⟴ self.user,
#             code='123456',
#             expires_at=timezone.now() + timezone.timedelta(minutes=10)
#         )
#         VerificationCode.objects.filter(user=self.user).delete()
#         code2 = VerificationCode.objects.create(
#             user=self.user,
#             code='789012',
#             expires_at= timezone.now() + timezone.timedelta(minutes=10)
#         )
#         self.assertFalse(VerificationCode.objects.filter(user=self.user, code='123456').exists())
#         self.assertTrue(VerificationCode.objects.filter(user=self.user, code='789012').exists())
#
#     def test_verification_code_expiry(self):
#         code = VerificationCode.objects.create(
#             user=self.user,
#             code='123456',
#             expires_at=timezone.now() - timezone.timedelta(minutes=1)
#         )
#         self.assertTrue(code.is_expired())
#
# class UserViewTests(TestCase):
#     def setUp(self):
#         self.client = Client()
#         self.user = User.objects.create_user(
#             username='testuser',
#             email='test@example.com',
#             password='securepass123',
#             is_active=False
#         )
#
#     def test_signup_view(self):
#         response = self.client.post(reverse('signup'), {
#             'username': 'newuser',
#             'email': 'new@example.com',
#             'password1': 'securepass123',
#             'password2': 'securepass123'
#         })
#         self.assertRedirects(response, reverse('verify_email'))
#         self.assertTrue(User.objects.filter(username='newuser').exists())
#
#     def test_verify_email_with_valid_code(self):
#         code = VerificationCode.objects.create(
#             user=self.user,
#             code='123456',
#             expires_at=timezone.now() + timezone.timedelta(minutes=10)
#         )
#         self.client.session['verification_token'] = Signer().sign(self.user.id)
#         self.client.session.save()
#         response = self.client.post(reverse('verify_email'), {'code': '123456'})
#         self.assertRedirects(response, reverse('home'))
#         self.user.refresh_from_db()
#         self.assertTrue(self.user.is_active)