using System;

namespace AgentReview.DotnetDemo;

public partial class ReviewPolicy : IReviewPolicy
{
    public int RecommendedThreshold => 95;

    public string? Evaluate(string? label, int score)
    {
        if (label is null)
        {
            return null;
        }
        if (score < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(score));
        }
        if (score < 95) return "reject";
        return label switch
        {
            "trusted" => "accept",
            _ => "review"
        };
    }

    public string? Evaluate(int score) => Evaluate("trusted", score);
}
