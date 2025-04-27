from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

# urlpatterns = [
#     path('signup/', views.signup_view, name='signup'),
#     path('login/', auth_views.LoginView.as_view(template_name='users/login.html'), name='login'),
#     path('logout/', auth_views.LogoutView.as_view(), name='logout'),
#     path('', views.home, name='home'),
# ]
urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('', views.home, name='home'),
]