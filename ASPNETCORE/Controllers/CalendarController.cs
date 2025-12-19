using System.Security.Claims;
using ASPNETCORE.DTO;
using ASPNETCORE.Interfaces;
using ASPNETCORE.Models;
using ASPNETCORE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ASPNETCORE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CalendarController(ICalenderService calenderService, IAuthService authService) : ControllerBase
    {


        [HttpPost("add-task")]
        [Authorize]
        public async Task<ActionResult<SerializedCalenderTask>> PostTask([FromBody] SerializedCalenderTask task)
        {
            try
            {
                var user = await authService.GetUserFromTokenAsync();
                var result = await calenderService.AddCalenderTask(task, user.Id);
                return Ok(result);


            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpGet("tasks")]
        [Authorize]
        public async Task<ActionResult<List<IScheduleItem>>> GetBusinessForCurrentUser([FromQuery] string? userId, [FromQuery] DateTime? start, [FromQuery] DateTime? end)
        {
            try
            {
                int targetUserId;
                bool isOwner = false;

                if (string.IsNullOrEmpty(userId) || userId.ToLower() == "me")
                {
                    var user = await authService.GetUserFromTokenAsync();
                    targetUserId = user.Id;
                    isOwner = true; // Viewing own calendar
                }
                else
                {
                    targetUserId = int.Parse(userId);
                    // Check if the requesting user is viewing their own calendar
                    var currentUser = await authService.GetUserFromTokenAsync();
                    isOwner = currentUser.Id == targetUserId;
                }

                // Default to wide range if not provided
                DateTime startDate = start ?? DateTime.MinValue;
                DateTime endDate = end ?? DateTime.MaxValue;

                var business = await calenderService.GetAllUserBusinessForInterval(targetUserId, startDate, endDate, isOwner);
                return Ok(business);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("update-task/{id}")]
        [Authorize]

        public async Task<ActionResult<SerializedCalenderTask>> UpdateCalenderTask([FromBody] UpdateCalenderTaskRequest request)
        {
            try
            {
                int taskId = int.Parse(Request.RouteValues["id"]!.ToString()!);
                var response = await calenderService.UpdateCalenderTask(taskId, request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });

            }
        }

        [HttpDelete("cancel-task/{id}")]
        [Authorize]
        public async Task<ActionResult<CalenderTask>> CancelCalenderTask()
        {
            try
            {
                int taskId = int.Parse(Request.RouteValues["id"]!.ToString()!);
                var response = await calenderService.CancelCalenderTask(taskId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });

            }
        }

        [HttpPost("book-user/{userId}")]
        [Authorize]
        public async Task<ActionResult<BookingResponse>> BookUser([FromBody] BookingRequest request)
        {
            try
            {
                int bookedUserId = int.Parse(Request.RouteValues["userId"]!.ToString()!);
                int bookerUser = authService.GetUserIdFromToken();
                var response = await calenderService.BookUser(bookedUserId, request, bookerUser);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });

            }
        }




        [HttpPost("respond-booking/{bookingId}")]
        [Authorize]
        public async Task<ActionResult<bool>> ResponsdToBooking([FromBody] bool accept)
        {
            try
            {
                int bookingId = int.Parse(Request.RouteValues["bookingId"]!.ToString()!);
                var response = await calenderService.RespondToBooking(bookingId, accept);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });

            }

        }

        [HttpGet("undecided-bookings")]
        [Authorize]
        public async Task<ActionResult<List<BookingResponse>>> GetAllUndecidedBookingsForUser()
        {
            try
            {
                var response = await calenderService.GetPendingBookingsWithConflicts();
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });

            }
        }

        [HttpGet("my-sent-bookings")]
        [Authorize]
        public async Task<ActionResult<List<Booking>>> GetMySentBookings()
        {
            try
            {
                var response = await calenderService.GetAllBookingsMadeByUser();
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("cancel-booking/{bookingId}")]
        [Authorize]
        public async Task<ActionResult<Booking>> CancelBooking()
        {
            try
            {
                int bookingId = int.Parse(Request.RouteValues["bookingId"]!.ToString()!);
                var response = await calenderService.CancelBooking(bookingId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("notifications")]
        [Authorize]
        public async Task<ActionResult<List<BookingNotification>>> GetNotifications()
        {
            try
            {
                var response = await calenderService.GetNotifications();
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("notifications/{notificationId}/read")]
        [Authorize]
        public async Task<ActionResult<bool>> MarkNotificationRead()
        {
            try
            {
                int notificationId = int.Parse(Request.RouteValues["notificationId"]!.ToString()!);
                var response = await calenderService.MarkNotificationRead(notificationId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }










































    }







}