namespace AgentReview.DotnetDemo;

public interface IReviewPolicy
{
    string? Evaluate(string? label, int score);
}
