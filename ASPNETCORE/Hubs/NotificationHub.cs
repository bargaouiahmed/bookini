using System;
using System.Security.Claims;
using ASPNETCORE.Services;
using Microsoft.AspNetCore.SignalR;

namespace ASPNETCORE.Hubs;

public class NotificationHub(ICalenderService calenderService):Hub
{

    public override async Task OnConnectedAsync()
    {
        int userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new Exception("User ID not found in claims"));
        await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        await base.OnConnectedAsync();
    }
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        int userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new Exception("User ID not found in claims"));
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubscribeToUserCalendar(int userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
    }

    public async Task SubscribeToCalendar(int calendarOwnerId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Calendar_{calendarOwnerId}");
    }

    public async Task UnsubscribeFromCalendar(int calendarOwnerId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Calendar_{calendarOwnerId}");
    }
}
