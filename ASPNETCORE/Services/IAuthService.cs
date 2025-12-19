using System;
using ASPNETCORE.DTO;
using ASPNETCORE.Interfaces;
using ASPNETCORE.Models;

namespace ASPNETCORE.Services;

public interface IAuthService
{


    public Task<SerializedUser> RegisterUserAsync(RegisterUserRequest request);
    public Task<TokenPair> LoginUserAsync(string username, string password);
    


    public Task<TokenPair> RefreshAccessTokenAsync(string refreshToken);
    public Task<User> GetUserFromTokenAsync();

    public int GetUserIdFromToken();
}
