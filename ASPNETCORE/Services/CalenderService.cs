using System;
using ASPNETCORE.DTO;
using ASPNETCORE.Hubs;
using ASPNETCORE.Interfaces;
using ASPNETCORE.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;

namespace ASPNETCORE.Services;

public class CalenderService(AppDbContext context, IAuthService authService, IHubContext<NotificationHub> hubContext) : ICalenderService
{


    public async Task<SerializedCalenderTask> AddCalenderTask(SerializedCalenderTask calenderTask, int? userId)
    {
        int _userId = userId ?? authService.GetUserIdFromToken();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == _userId)
            ?? throw new InvalidOperationException("User with given Id does not exist");

        var startTimeUtc = calenderTask.StartTime.ToUniversalTime();
        var endTimeUtc = calenderTask.EndTime.ToUniversalTime();

        // Check for exact duplicate
        if (await context.Tasks.AnyAsync(ct =>
            ct.EndTime == endTimeUtc && ct.StartTime == startTimeUtc &&
            ct.Title == calenderTask.Title && ct.UserId == _userId))
        {
            throw new InvalidOperationException("Record seems to already exist");
        }

        // Check for any overlap
        // if (await context.Tasks.AnyAsync(ct => 
        //     ct.UserId == userId && 
        //     ct.StartTime < endTimeUtc && ct.EndTime > startTimeUtc))
        // {
        //     throw new InvalidOperationException("Time slot conflict with existing task");
        // }
        if (!await ValidateNewTaskEntry(_userId, calenderTask))
        {
            throw new InvalidOperationException("Invalid time range or conflicting task exists");
        }

        CalenderTask task = new()
        {
            Title = calenderTask.Title,
            StartTime = startTimeUtc,
            EndTime = endTimeUtc,
            UserId = _userId
        };

        await context.Tasks.AddAsync(task);
        await context.SaveChangesAsync();
        await hubContext.Clients.Group($"User_{_userId}").SendAsync("CalenderTaskAdded", new SerializedCalenderTask
        {
            Title = task.Title,
            StartTime = task.StartTime,
            EndTime = task.EndTime,
            MadeBy = user.Username
        });
        await hubContext.Clients.Group($"Calendar_{_userId}").SendAsync("CalendarUpdated", new
        {
            Type = "TaskAdded",
            Title = task.Title
        });
        return calenderTask;
    }




    private async Task<bool> ValidateNewTaskEntry(int userId, SerializedCalenderTask calenderTask)
    {
        DateTime startUtc = calenderTask.StartTime.ToUniversalTime();
        DateTime endUtc = calenderTask.EndTime.ToUniversalTime();

        var coincidingActivities = await GetCoincidingActivitiesForUser(userId, startUtc, endUtc);
        if (startUtc < endUtc && coincidingActivities.Count == 0)
        {
            return true;
        }
        return false;
    }
    public async Task<bool> UpdateCalenderTask(int id, UpdateCalenderTaskRequest uptr)
    {
        int userId = authService.GetUserIdFromToken();

        CalenderTask task = await context.Tasks.FirstOrDefaultAsync(t => t.Id == id) ?? throw new InvalidOperationException("Record doesn't exist bozo");

        if (task.UserId != userId)
        {
            throw new UnauthorizedAccessException("You are not authorized to update this task");
        }

        DateTime effectiveStart = uptr.StartTime?.ToUniversalTime() ?? task.StartTime;
        DateTime effectiveEnd = uptr.EndTime?.ToUniversalTime() ?? task.EndTime;
        if (await ValidateUpdateRequest(userId, uptr, task))
        {
            task.StartTime = effectiveStart;
            task.EndTime = effectiveEnd;
            task.Title = uptr.Title ?? task.Title;
            await context.SaveChangesAsync();
            await hubContext.Clients.Group($"User_{userId}").SendAsync("CalenderTaskUpdated", new SerializedCalenderTask
            {
                Title = task.Title,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                MadeBy = (await context.Users.FirstOrDefaultAsync(u => u.Id == userId))?.Username
            });
            await hubContext.Clients.Group($"Calendar_{userId}").SendAsync("CalendarUpdated", new
            {
                Type = "TaskUpdated",
                Title = task.Title
            });
            return true;

        }
        return false;





    }


    private async Task<bool> ValidateUpdateRequest(int userId, UpdateCalenderTaskRequest uptr, CalenderTask taskToUpdate)
    {
        //if no start time: verify that the endtime doesn't intersect with other tasks! then do the update
        DateTime effectiveStart = uptr.StartTime?.ToUniversalTime() ?? taskToUpdate.StartTime;
        DateTime effectiveEnd = uptr.EndTime?.ToUniversalTime() ?? taskToUpdate.EndTime;
        var coincidingActivities = await GetCoincidingActivitiesForUser(userId, effectiveStart, effectiveEnd, taskToUpdate.Id);
        if (effectiveStart < effectiveEnd && coincidingActivities.Count == 0)
        {
            return true;


        }
        return false;


    }
    public async Task<List<SerializedCalenderTask>> GetAllUserTasks(int userId)
    {
        List<SerializedCalenderTask> tasks = await context.Tasks
        .Where(t => t.UserId == userId)
        .Select(t => new SerializedCalenderTask
        {
            Id = t.Id,
            Title = t.Title,
            StartTime = t.StartTime,
            EndTime = t.EndTime
        }).ToListAsync();

        return tasks;

    }
    private async Task<List<IScheduleItem>> GetCoincidingActivitiesForUser(int userId, DateTime startTime, DateTime endTime, int? excludeTaskId = null, int? excludeBookingId = null)
    {
        var startUtc = startTime.ToUniversalTime();
        var endUtc = endTime.ToUniversalTime();

        List<IScheduleItem> tasks = await context.Tasks
            .Where(t => t.UserId == userId &&
                        (excludeTaskId == null || t.Id != excludeTaskId) &&
                        t.StartTime < endUtc && t.EndTime > startUtc)
            .Select(t => new SerializedCalenderTask { Id = t.Id, Title = t.Title, StartTime = t.StartTime, EndTime = t.EndTime })
            .Cast<IScheduleItem>()
            .ToListAsync();

        var bookings = await context.Bookings
            .Where(b => b.BookedUserId == userId &&
                        (excludeBookingId == null || b.Id != excludeBookingId) &&
                        b.StartTime < endUtc && b.EndTime > startUtc && b.Status == "Confirmed")
            .Select(b => new BookingResponse { Title = b.Title, StartTime = b.StartTime, EndTime = b.EndTime, Location = b.Location })
            .Cast<IScheduleItem>()
            .ToListAsync();

        tasks.AddRange(bookings);
        return tasks;
    }
    public async Task<BookingResponse> BookUser(int userId, BookingRequest request, int bookerId)
    {
        User bookedUser = await context.Users.FirstOrDefaultAsync(u => u.Id == userId) ?? throw new InvalidOperationException("User doesn't exist");
        User bookerUser = await context.Users.FirstOrDefaultAsync(u => u.Id == bookerId) ?? throw new InvalidOperationException("User doesn't exist");

        // Only check against CONFIRMED activities (tasks + confirmed bookings)
        // Pending bookings should NOT block new booking requests
        List<IScheduleItem> activities = await GetCoincidingActivitiesForUser(userId, request.StartTime, request.EndTime);
        if (activities.Count > 0)
        {
            throw new InvalidOperationException("This time slot conflicts with an existing confirmed event");
        }

        // Check if there are conflicting PENDING bookings (for notification purposes)
        var conflictingPending = await GetConflictingPendingBookings(userId, request.StartTime, request.EndTime);
        bool hasConflict = conflictingPending.Count > 0;

        Booking booking = new()
        {
            Title = request.Title,
            Location = request.Location,
            StartTime = request.StartTime.ToUniversalTime(),
            EndTime = request.EndTime.ToUniversalTime(),
            Booker = bookerUser,
            BookedUser = bookedUser
        };
        await context.AddAsync(booking);
        await context.SaveChangesAsync();

        var notification = new BookingNotification
        {
            Message = $"{bookerUser.Username} wants to book you: {booking.Title}",
            BookingId = booking.Id,
            BookerId = bookerId,
            BookedId = userId
        };
        await context.BookingNotifications.AddAsync(notification);
        await context.SaveChangesAsync();

        await hubContext.Clients.Group($"User_{userId}").SendAsync("NewBookingRequest", new BookingResponse
        {
            Id = booking.Id,
            Title = booking.Title,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime,
            Location = booking.Location,
            Status = booking.Status,
            MadeBy = bookerUser.Username,
            HasConflict = hasConflict
        });

        return new BookingResponse
        {
            Id = booking.Id,
            Title = booking.Title,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime,
            Location = booking.Location,
            Status = booking.Status,
            HasConflict = hasConflict
        };
    }

    private async Task<List<Booking>> GetConflictingPendingBookings(int userId, DateTime startTime, DateTime endTime, int? excludeBookingId = null)
    {
        var startUtc = startTime.ToUniversalTime();
        var endUtc = endTime.ToUniversalTime();

        return await context.Bookings
            .Where(b => b.BookedUserId == userId &&
                        b.Status == "Pending" &&
                        (excludeBookingId == null || b.Id != excludeBookingId) &&
                        b.StartTime < endUtc && b.EndTime > startUtc)
            .ToListAsync();
    }



    //This method is the key for sharing the calendar data between users for booking and viewing
    // isOwner=true includes pending bookings for the calendar owner to see
    public async Task<List<IScheduleItem>> GetAllUserBusinessForInterval(int userId, DateTime start, DateTime end, bool isOwner = false)
    {
        var startUtc = start.ToUniversalTime();
        var endUtc = end.ToUniversalTime();

        List<IScheduleItem> tasks = await context.Tasks
            .Where(t => t.UserId == userId && t.StartTime < endUtc && t.EndTime > startUtc)
            .Select(t => new SerializedCalenderTask { Id = t.Id, Title = t.Title, StartTime = t.StartTime, EndTime = t.EndTime, MadeBy = t.User!.Username })
            .Cast<IScheduleItem>()
            .ToListAsync();

        // Bookings where this user is the BOOKED user (someone booked them)
        var bookingsAsBookedQuery = context.Bookings
            .Where(b => b.BookedUserId == userId && b.StartTime < endUtc && b.EndTime > startUtc);

        if (isOwner)
        {
            // Owner sees their pending + confirmed incoming bookings
            bookingsAsBookedQuery = bookingsAsBookedQuery.Where(b => b.Status == "Confirmed" || b.Status == "Pending");
        }
        else
        {
            // External viewers only see confirmed bookings
            bookingsAsBookedQuery = bookingsAsBookedQuery.Where(b => b.Status == "Confirmed");
        }

        var bookingsAsBooked = await bookingsAsBookedQuery
            .Select(b => new BookingResponse
            {
                Id = b.Id,
                Title = b.Title,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Location = b.Location,
                MadeBy = b.Booker!.Username,
                Status = b.Status
            })
            .Cast<IScheduleItem>()
            .ToListAsync();

        tasks.AddRange(bookingsAsBooked);

        tasks.AddRange(bookingsAsBooked);

        // Include bookings where this user is the BOOKER (they booked someone else)
        // This shows as "Busy" for external viewers or normal events for owner
        var bookingsAsBookerQuery = context.Bookings
            .Where(b => b.BookerId == userId && b.Status == "Confirmed" && b.StartTime < endUtc && b.EndTime > startUtc);

        var bookingsAsBooker = await bookingsAsBookerQuery
            .Select(b => new BookingResponse
            {
                Id = b.Id,
                Title = isOwner ? b.Title : "Busy",
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Location = isOwner ? b.Location : null,
                MadeBy = isOwner ? "You → " + b.BookedUser!.Username : "Busy",
                Status = b.Status
            })
            .Cast<IScheduleItem>()
            .ToListAsync();

        tasks.AddRange(bookingsAsBooker);

        return tasks;
    }
    public async Task<Booking> CancelBooking(int bookingId)
    {

        Booking booking = await context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId) ?? throw new InvalidOperationException("Booking doesn't exist");
        if (!(booking.BookedUserId == authService.GetUserIdFromToken()) && !(booking.BookerId == authService.GetUserIdFromToken()))
        {
            throw new UnauthorizedAccessException("You are not authorized to cancel this booking");
        }
        context.Bookings.Remove(booking);
        await context.SaveChangesAsync();
        await hubContext.Clients.Group($"User_{booking.BookedUserId}").SendAsync("BookingCancelled", booking.Title);
        await hubContext.Clients.Group($"User_{booking.BookerId}").SendAsync("BookingCancelled", booking.Title);
        return booking;
    }


    public async Task<CalenderTask> CancelCalenderTask(int taskId)
    {
        CalenderTask task = await context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId) ?? throw new InvalidOperationException("Invalid task id");
        if (!(task.UserId == authService.GetUserIdFromToken()))
        {
            throw new UnauthorizedAccessException("You're not authorized to delete this task");
        }

        context.Tasks.Remove(task);
        await context.SaveChangesAsync();
        await hubContext.Clients.Group($"User_{task.UserId}").SendAsync("CalenderTaskRemoved", task.Title);
        await hubContext.Clients.Group($"Calendar_{task.UserId}").SendAsync("CalendarUpdated", new
        {
            Type = "TaskRemoved",
            Title = task.Title
        });
        return task;
    }

    public async Task<List<IScheduleItem>> GetAllUserBusiness(int userId)
    {
        var bookings = await context.Bookings
            .Where(b => (b.BookerId == userId || b.BookedUserId == userId) && b.Status == "Confirmed")
            .Select(b => new BookingResponse
            {
                Title = b.Title,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
            })
            .ToListAsync();

        var tasks = await context.Tasks
            .Where(t => t.UserId == userId)
            .Select(t => new SerializedCalenderTask
            {
                Id = t.Id,
                Title = t.Title,
                StartTime = t.StartTime,
                EndTime = t.EndTime,
            })
            .ToListAsync();

        List<IScheduleItem> scheduleItems = [.. bookings, .. tasks];

        return scheduleItems;
    }

    public Task<List<Booking>> GetAllUndecidedBookingsForUser()
    {
        int userId = authService.GetUserIdFromToken();
        return context.Bookings
            .Where(b => b.BookedUserId == userId && b.Status == "Pending")
            .ToListAsync();

    }


    public async Task<bool> RespondToBooking(int bookingId, bool accept)
    {
        Booking booking = await context.Bookings
            .Include(b => b.BookedUser)
            .FirstOrDefaultAsync(b => b.Id == bookingId)
            ?? throw new InvalidOperationException("Booking not found");

        int userId = authService.GetUserIdFromToken();
        if (booking.BookedUserId != userId)
        {
            throw new UnauthorizedAccessException("You are not authorized to respond to this booking");
        }

        if (accept)
        {
            booking.Status = "Confirmed";
        }
        else
        {
            booking.Status = "Declined";
        }

        await context.SaveChangesAsync();

        var responseNotification = new BookingNotification
        {
            Message = $"{booking.BookedUser?.Username} {booking.Status.ToLower()} your booking: {booking.Title}",
            BookingId = booking.Id,
            BookerId = userId,
            BookedId = booking.BookerId
        };
        await context.BookingNotifications.AddAsync(responseNotification);
        await context.SaveChangesAsync();

        await hubContext.Clients.Group($"User_{booking.BookerId}").SendAsync("BookingResponseReceived", new
        {
            BookingId = booking.Id,
            Title = booking.Title,
            Status = booking.Status,
            BookedUserName = booking.BookedUser?.Username
        });

        if (accept)
        {
            await hubContext.Clients.Group($"Calendar_{userId}").SendAsync("CalendarUpdated", new
            {
                Type = "BookingConfirmed",
                BookingId = booking.Id
            });
        }

        return true;
    }
    public async Task<List<Booking>> GetAllBookingsMadeByUser()
    {
        int userId = authService.GetUserIdFromToken();
        return await context.Bookings
            .Include(b => b.BookedUser)
            .Where(b => b.BookerId == userId)
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();
    }

    public async Task<List<BookingResponse>> GetPendingBookingsWithConflicts()
    {
        int userId = authService.GetUserIdFromToken();
        var pendingBookings = await context.Bookings
            .Include(b => b.Booker)
            .Where(b => b.BookedUserId == userId && b.Status == "Pending")
            .OrderBy(b => b.StartTime)
            .ToListAsync();

        var results = new List<BookingResponse>();

        // For each pending booking, check if it conflicts with other pending bookings
        foreach (var booking in pendingBookings)
        {
            var conflicts = await GetConflictingPendingBookings(userId, booking.StartTime, booking.EndTime, booking.Id);
            results.Add(new BookingResponse
            {
                Id = booking.Id,
                Title = booking.Title,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Location = booking.Location,
                Status = booking.Status,
                HasConflict = conflicts.Count > 0,
                MadeBy = booking.Booker?.Username
            });
        }

        return results;
    }

    public async Task<List<BookingNotification>> GetNotifications()
    {
        int userId = authService.GetUserIdFromToken();
        return await context.BookingNotifications
            .Include(n => n.Booking)
            .Include(n => n.Booker)
            .Where(n => n.BookedId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();
    }

    public async Task<bool> MarkNotificationRead(int notificationId)
    {
        int userId = authService.GetUserIdFromToken();
        var notification = await context.BookingNotifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.BookedId == userId);

        if (notification == null) return false;

        notification.IsRead = true;
        await context.SaveChangesAsync();
        return true;
    }
}
