using System;
using ASPNETCORE.DTO;
using ASPNETCORE.Interfaces;
using ASPNETCORE.Models;
using Microsoft.AspNetCore.SignalR;

namespace ASPNETCORE.Services;


public interface ICalenderService
{


    public Task<SerializedCalenderTask> AddCalenderTask(SerializedCalenderTask calenderTask, int? userId);
    public Task<bool> UpdateCalenderTask(int id, UpdateCalenderTaskRequest uptr);
    public Task<List<SerializedCalenderTask>> GetAllUserTasks(int userId);

    public Task<BookingResponse> BookUser(int userId, BookingRequest request, int bookerId);
    public Task<List<IScheduleItem>> GetAllUserBusinessForInterval(int userId, DateTime start, DateTime end, bool isOwner = false);

    public Task<Booking> CancelBooking(int bookingId);
    public Task<CalenderTask> CancelCalenderTask(int taskId);
    public Task<List<IScheduleItem>> GetAllUserBusiness(int userId);
    public Task<List<Booking>> GetAllUndecidedBookingsForUser();
    public Task<List<Booking>> GetAllBookingsMadeByUser();
    public Task<bool> RespondToBooking(int bookingId, bool accept);
    public Task<List<BookingResponse>> GetPendingBookingsWithConflicts();
    public Task<List<BookingNotification>> GetNotifications();
    public Task<bool> MarkNotificationRead(int notificationId);


}



