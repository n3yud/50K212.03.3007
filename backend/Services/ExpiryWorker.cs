using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
public class ExpiryWorker(IServiceScopeFactory scopes, ILogger<ExpiryWorker> logger) : BackgroundService
{
    public static Task<int> Expire(AppDb db) => db.Leaves.Where(x => x.Deadline < Rules.Today && (x.Status == States.MakeUpWaiting || x.Status == States.Registered || x.Status == States.Approval)).ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, States.Expired).SetProperty(x => x.MakeUpSessionId, (Guid?)null));
    protected override async Task ExecuteAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try { using var scope = scopes.CreateScope(); await Expire(scope.ServiceProvider.GetRequiredService<AppDb>()); }
            catch (Exception e) { logger.LogWarning(e, "Could not expire make-up requests"); }
            try { await Task.Delay(TimeSpan.FromSeconds(20), token); } catch (OperationCanceledException) { break; }
        }
    }
}
