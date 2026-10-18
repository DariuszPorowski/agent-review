using Xunit;

namespace AgentReview.DotnetDemo.Tests;

public class ReviewPolicyTests
{
    [Fact]
    public void AcceptsTrustedHighScores()
    {
        var policy = new ReviewPolicy();
        Assert.Equal("accept", policy.Evaluate("trusted", 99));
    }

    [Fact]
    public void ReviewsUntrustedHighScores()
    {
        var policy = new ReviewPolicy();
        Assert.Equal("review", policy.Evaluate("unknown", 99));
    }

    [Fact]
    public void RejectsLowScores()
    {
        var policy = new ReviewPolicy();
        Assert.Equal("reject", policy.Evaluate("trusted", 80));
    }

    [Fact]
    public void CreatesJsonReceipt()
    {
        var policy = new ReviewPolicy();
        Assert.Contains("\"Decision\":\"accept\"", policy.CreateReceipt("trusted", 99));
    }
}
